import {Request, Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env'

export type AuthUser = {
    userId: string
}

export interface AuthenticateRequest extends Request {
    user?: AuthUser
}

export function authenticateAccessToken(req: AuthenticateRequest, res: Response, next: NextFunction) {
    const token = req.cookies.accessToken

    if(!token) {
        return res.status(401).json({error: 'Invalid token'})
    }

    try{
        const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET!) as AuthUser
        req.user = {userId: decoded.userId}
        next()
    }catch(error){
        if(error instanceof jwt.TokenExpiredError){
            return res.status(401).json({error: 'Invalid token'})
        }

        return res.status(401).json({error: 'Invalid token'})
    }
}