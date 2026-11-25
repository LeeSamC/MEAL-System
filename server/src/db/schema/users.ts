import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
    userId: uuid('user_id').defaultRandom().primaryKey(),
    email: varchar('email').notNull().unique(),
    name: varchar('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    disabled: boolean('disabled').notNull().default(false)
})