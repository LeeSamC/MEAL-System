import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { and, eq, gt } from 'drizzle-orm'

import { env } from '../env'
import { db } from '../db'
import { refreshTokens } from '../db/schema'

const accessClaimsSchema = z.object({
    userId: z.uuid(),
    sessionId: z.uuid()
})

export type AuthUser = z.infer<typeof accessClaimsSchema>

export interface AuthenticateRequest extends Request {
    user?: AuthUser
}

export async function authenticateAccessToken(req: AuthenticateRequest, res: Response, next: NextFunction) {
    const token = req.cookies?.accessToken

    if(typeof token !== 'string' || !token){
        return res.status(401).json({error: 'Invalid token'})
    }

    if(!env.ACCESS_TOKEN_SECRET){
        return next(new Error('Access token secret not configured'))
    }

    let claims: AuthUser

    try{
        const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {algorithms: ['HS256']})

        const result = accessClaimsSchema.safeParse(decoded)

        if(!result.success){
            return res.status(401).json({ error: 'Invalid token' })
        }

        claims = result.data
    }catch (error) {
         return res.status(401).json({ error: 'Invalid token' })
    }

    try{
        const session  = await db.query.refreshTokens.findFirst({where: and(
            eq(refreshTokens.id, claims.sessionId),
            eq(refreshTokens.userId, claims.userId),
            eq(refreshTokens.revoked, false),
            gt(refreshTokens.expiresAt, new Date())
        )})

        if(!session){
            return res.status(401).json({error: 'Session expired or revoked'})
        }
    }catch (error) {
        return next(error)
    }

    req.user = claims
    next()
}