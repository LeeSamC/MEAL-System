import {pgTable, uuid, varchar, timestamp, boolean} from 'drizzle-orm/pg-core'
import { users } from './users'

export const refreshTokens = pgTable('refresh-tokens', {
    id: uuid('id').defaultRandom().primaryKey(),
    tokenHash: varchar('token_hash', {length: 500}).notNull().unique(),
    userId: uuid('user_id').notNull().references(() => users.userId, {onDelete: 'cascade'}),
    expiresAt: timestamp('expires_at').notNull(),
    revoked: boolean('revoked').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow()
})