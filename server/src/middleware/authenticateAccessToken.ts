import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { and, eq, gt } from 'drizzle-orm'

import { env } from '../env'
import { db } from '../db'
import { refreshTokens, users } from '../db/schema'

const accessClaimsSchema = z.object({
  userId: z.uuid(),
  sessionId: z.uuid(),
})

export type AuthUser = z.infer<typeof accessClaimsSchema>

export interface AuthenticateRequest extends Request {
  user?: AuthUser
}

export async function authenticateAccessToken(
  req: AuthenticateRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.accessToken

  if (typeof token !== 'string' || !token) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  let claims: AuthUser

  try {
    const decoded = jwt.verify(
      token,
      env.ACCESS_TOKEN_SECRET,
      { algorithms: ['HS256'] },
    )

    const result = accessClaimsSchema.safeParse(decoded)

    if (!result.success) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    claims = result.data
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  try {
    const [session] = await db
      .select()
      .from(refreshTokens)
      .innerJoin(users, eq(users.userId, refreshTokens.userId))
      .where(and(
        eq(refreshTokens.id, claims.sessionId),
        eq(refreshTokens.userId, claims.userId),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, new Date()),
        eq(users.disabled, false),
      ))

    if (!session) {
      return res.status(401).json({
        error: 'Session expired or revoked',
      })
    }
  } catch (error) {
    return next(error)
  }

  req.user = claims
  next()
}