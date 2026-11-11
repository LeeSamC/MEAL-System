import {Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'

import { db } from '../db'
import { refreshTokens } from '../db/schema'
import { eq } from 'drizzle-orm'
import { env } from '../env'

import { AuthUser } from './authenticateAccessToken'
import { AuthenticateRequest } from './authenticateAccessToken'

export async function authenticateRefreshToken(req: AuthenticateRequest, res: Response, next: NextFunction) {
    const token = req.cookies.refreshToken

    if(!token){
        return res.status(401).json({error: 'Invalid token'})
    }

    try{
        const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET!) as AuthUser
        const refreshToken = await db.query.refreshTokens.findFirst({where: eq(refreshTokens.tokenHash, token)})

        if(!refreshToken || refreshToken.revoked || refreshToken.expiresAt <= new Date()) {
            return res.status(401).json({error: 'Invalid token'})
        }

        req.user = {userId: decoded.userId}

        next()
    }catch (error) {
        console.error(error)

        return res.status(401).json({error: 'Invalid token'})
    }
}