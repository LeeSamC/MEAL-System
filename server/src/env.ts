import dotenv from 'dotenv'
import {z} from 'zod'

dotenv.config({path: ['.env.local', 'env'], quiet: true})

const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().min(1).default('127.0.0.1'),
    DATABASE_URL: z.string().min(1),
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    AI_ENDPOINT: z.url({protocol: /^https?$/}).optional(),
    AI_MODEL: z.string().min(1).optional(),
    AI_API_KEY: z.string().min(1).optional(),
    DEMO_USER_PASSWORD: z.string().max(128).optional()
})

const parsed = schema.safeParse(process.env)

if(!parsed.success){
    console.error('Invalid environment configuration')
    for( const issue of parsed.error.issues){
        console.error(` - ${issue.path.join('.')}: ${issue.message}`)
    }

    process.exit(1)
}

export const env = parsed.data