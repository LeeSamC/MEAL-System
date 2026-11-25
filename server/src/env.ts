import dotenv from 'dotenv'
import {z} from 'zod'

dotenv.config({path: ['.env.local', 'env'], quiet: true})

export const env = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    PORT: z.coerce.number().int().min(1).max(65535).default(4000),

    HOST: z.string().default('127.0.0.1'),

    DATABASE_URL: z.string().min(1),

    CORS_ORIGIN: z.url().default('http://localhost:5173'),

    UPLOAD_DIR: z.string().default('./uploads'),

    ACCESS_TOKEN_SECRET: z.string().min(32),

    REFRESH_TOKEN_SECRET: z.string().min(32),

    FILE_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
}).parse(process.env)

if(env.ACCESS_TOKEN_SECRET === env.REFRESH_TOKEN_SECRET){
    throw new Error('Access and refresh secrets must differ')
}