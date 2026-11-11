import type {ErrorRequestHandler, NextFunction, Request, RequestHandler, Response} from 'express'

import multer from 'multer'
import { ZodType } from 'zod'

export class HttpError extends Error {
    constructor(public status: number, message: string, public details?: unknown){
        super(message)
    }
}

export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
    (req, res, next) => {
        fn(req,res, next).catch(next)
    }

export const validate =
    (schema: ZodType, source: 'body' | 'query' | 'params'): RequestHandler =>
    (req, res, next) => {
        const result = schema.safeParse(req[source])
        if(!result.success) {
            return next(new HttpError(400, 'Validation failed', result.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message
            }))))
        }
        res.locals[source] = result.data
        next()
    }

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if(err instanceof HttpError){
        return res.status(err.status).json({error: err.message, details: err.details})
    }
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message })
    }
    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
        return res.status(400).json({ error: 'The request contains invalid JSON.' })
    }
    if (err instanceof Error && 'status' in err && err.status === 413) {
        return res.status(413).json({ error: 'The request is too large.' })
    }
    console.error('API request failed', err instanceof Error ? err.name : 'Unknown error')
    res.status(500).json({error: 'Internal server error'})
}