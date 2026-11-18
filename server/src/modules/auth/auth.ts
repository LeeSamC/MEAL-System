import { Router } from "express";
import {z} from 'zod'
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken";
import { asyncHandler, HttpError } from "../../middleware/errors";

import { db } from "../../db";
import { eq, and, gt} from "drizzle-orm";
import { users, refreshTokens } from "../../db/schema";
import { env } from "../../env";
import { randomUUID } from "node:crypto";
import { hashToken } from "../../utils/hashToken";
import { rateLimiter } from "../../middleware/rateLimiter";

import { authenticateRefreshToken } from '../../middleware/authenticateRefreshToken'
import type { AuthenticateRequest } from '../../middleware/authenticateAccessToken'


const router = Router()

const loginSchema = z.object({
    name: z.string().min(1, 'Must have a username'),
    password: z.string().min(1, 'Must have a password').max(8, 'Must be 8 characters long')
})

function issueAccessToken(userId: string, sessionId: string){
    if(!env.ACCESS_TOKEN_SECRET){
        throw new Error('Access token secret not configured')
    }

    return jwt.sign({userId, sessionId}, env.ACCESS_TOKEN_SECRET, {expiresIn: '30m', algorithm: 'HS256'})
}

function issueRefreshToken(userId: string){
    if(!env.REFRESH_TOKEN_SECRET){
        throw new Error('Refresh token secret not configured')
    }

    return jwt.sign({userId}, env.REFRESH_TOKEN_SECRET, {expiresIn: '7d', jwtid: randomUUID()})
}

function setAuthCookies(res: any, accessToken: string, refreshToken: string){
    const isProduction = env.NODE_ENV === 'production'

    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/'
    }

    res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 30 * 60 * 1000
    })

    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
}

function clearAuthCookies(res: any){
    const isProduction = env.NODE_ENV === 'production'

    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/'
    }

    res.clearCookie('accessToken', cookieOptions)
    res.clearCookie('refreshToken', cookieOptions)
}

router.post('/login', rateLimiter, asyncHandler(async (req, res) => {
    
    const result = loginSchema.safeParse(req.body)

    if(!result.success){
        throw new HttpError(400, 'Validation failed', 
            result.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message
            }))
        )
    }

    const data = result.data

    const existingUser = await db.query.users.findFirst({where: eq(users.name, data.name)})

    if(!existingUser){
        throw new HttpError(401, 'The name or password is incorrect')
    }

    const validPassword = await bcrypt.compare(data.password, existingUser.passwordHash)

    if(!validPassword){
        throw new HttpError(401, 'The name or password is incorrect')
    }

    const sessionId = randomUUID()

    const accessToken = issueAccessToken(existingUser.userId, sessionId)
    const refreshToken = issueRefreshToken(existingUser.userId)

    await db.transaction(async tx => {
        await tx.delete(refreshTokens).where(
            eq(refreshTokens.userId, existingUser.userId)
        )

        await tx.insert(refreshTokens).values({
            id: sessionId,
            tokenHash: hashToken(refreshToken),
            userId: existingUser.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revoked: false
        })
    })

    setAuthCookies(res, accessToken, refreshToken)

    return res.status(200).json({
        message: 'User sucessfully logged in',
        user: {
            userId: existingUser.userId,
            name: existingUser.name
        }
    })
    
}))

router.post('/logout', authenticateRefreshToken, asyncHandler(async(req:AuthenticateRequest, res) => {
    const user = req.user

    if(!user){
        throw new HttpError(401, 'Invalid Session')
    }

    await db.update(refreshTokens).set({
        revoked: true
    })
    .where(eq(refreshTokens.id, user.sessionId))

    clearAuthCookies(res)

    return res.status(200).json({message: 'Successfully logged out'})
}))

router.post('/refresh', authenticateRefreshToken, asyncHandler(async(req: AuthenticateRequest, res) => {
    res.setHeader('Cache-Control', 'no-store')

    const user = req.user
    const currentRefreshToken = req.cookies.refreshToken

    if(!user || typeof currentRefreshToken !== 'string' || !currentRefreshToken) {
        throw new HttpError(401, 'Invalid Session')
    }

    const accessToken = issueAccessToken(user.userId, user.sessionId)
    const newRefreshToken = issueRefreshToken(user.userId)

    const [updatedSession] = await db.update(refreshTokens).set({
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date( Date.now() + 7 * 24 * 60 * 60 * 1000)
    })
    .where(
        and(
            eq(refreshTokens.id, user.sessionId),
            eq(refreshTokens.userId, user.userId),
            eq(refreshTokens.tokenHash, hashToken(currentRefreshToken)),
            eq(refreshTokens.revoked, false),
            gt(refreshTokens.expiresAt, new Date())

        )
    )
    .returning({id: refreshTokens.id})

    if(!updatedSession){
        throw new HttpError(401, 'Refresh token expired, revoked or already used')
    }

    setAuthCookies(res, accessToken, newRefreshToken)

    return res.status(200).json({message: 'Tokens refreshed successfully'})
    
}))