import { Router } from "express";
import {z} from 'zod'
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken";


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

router.post('/login', rateLimiter, async (req, res) => {

    try{

        const data = loginSchema.parse(req.body)

        const existingUser = await db.query.users.findFirst({where: eq(users.name, data.name)})

        if(!existingUser){
            return res.status(401).json({message: 'The name or password is incorrect'})
        }

        const validPassword = await bcrypt.compare(data.password, existingUser.passwordHash)

        if(!validPassword) {
            return res.status(401).json({message: 'The name or passowrd is incorrect'})
        }

        const sessionId = randomUUID()

        const accessToken = issueAccessToken(existingUser.userId, sessionId)
        const refreshToken = issueRefreshToken(existingUser.userId)

        await db.transaction(async tx => {
            await tx.delete(refreshTokens).where(eq(refreshTokens.userId, existingUser.userId))

            await tx.insert(refreshTokens).values({
                id: sessionId,
                tokenHash: hashToken(refreshToken),
                userId: existingUser.userId,
                expiresAt: new Date( Date.now() + 7 * 24 * 60 * 60 * 1000 ),
                revoked: false
            })
        })

        setAuthCookies(res, accessToken, refreshToken)

        return res.status(200).json({
            message: 'User successfully logged in',
            user: {
                userId: existingUser.userId,
                name: existingUser.name
            }
        })

    }catch (error){
        console.error(error)

        return res.status(500).json({message: 'Failed to login'})

    }
    
})

router.post('/logout', authenticateRefreshToken, async(req:AuthenticateRequest, res) => {
    const user = req.user

    if(!user){
        return res.status(401).json({error: 'Invalid session'})
    }

    try{
        await db.update(refreshTokens).set({revoked: true}).where(eq(refreshTokens.id, user.sessionId))

        clearAuthCookies(res)

        return res.status(200).json({message: 'Successfully logged out'})

    }catch (error) {
        return res.status(500).json({message: 'Failed to logout'})
    }
})

router.post('/refresh', authenticateRefreshToken, async(req: AuthenticateRequest, res) => {
    res.setHeader('Cache-Control', 'no-store')

    const user = req.user
    const currentRefreshToken = req.cookies.refreshToken

    if(!user || typeof currentRefreshToken !== 'string' || !currentRefreshToken) {
        return res.status(401).json({message: 'Invalid session'})
    }

    try{
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
            return res.status(200).json({error: 'Refresh token expired, revoked or already used'})
        }

        setAuthCookies(res, accessToken, newRefreshToken)

        return res.status(200).json({message: 'Tokens refreshed successfully'})
    }catch (error){
        console.error(error)

        return res.status(500).json({message: 'Failed   to refresh tokens'})
    }
})