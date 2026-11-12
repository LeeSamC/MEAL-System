import {Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'

import { db } from '../db'
import { refreshTokens } from '../db/schema'
import { eq } from 'drizzle-orm'
import { env } from '../env'

import { AuthUser } from './authenticateAccessToken'
import { AuthenticateRequest } from './authenticateAccessToken'
import { hashToken } from '../utils/hashToken'

export async function authenticateRefreshToken(req: AuthenticateRequest, res: Response, next: NextFunction) {
    const token = req.cookies?.refreshToken

    if(typeof token !== 'string' || !token) {
        return res.status(401).json({error: 'Invalid token'})
    }

    try{
        const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET!, {algorithms: ['HS256']})
        
        if(typeof decoded === 'string' || typeof decoded.userId !== 'string'){
            return res.status(401).json({error: 'Invalid token'})
        }

        const tokenHash = hashToken(token)

        const refreshToken = await db.query.refreshTokens.findFirst({where: eq(refreshTokens.tokenHash, tokenHash)})

        if(!refreshToken || refreshToken.revoked || refreshToken.expiresAt <= new Date() || refreshToken.userId !== decoded.userId){
            return res.status(401).json({error: 'Invalid token'})
        }

        req.user = {userId: decoded.userId}
    }catch {
        return res.status(401).json({ error: 'Invalid token' })
    }

    next()
}