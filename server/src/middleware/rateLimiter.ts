import {rateLimit} from 'express-rate-limit'

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 10,

    skipSuccessfulRequests: true,

    standardHeaders: 'draft-8',
    legacyHeaders: false,
    
    statusCode: 429,
    message: {
        message: 'Too many login attempts. Please try again later'
    }
})