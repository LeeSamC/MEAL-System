import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";

export const user = pgTable('user', {
    userId: uuid('user_id').defaultRandom().primaryKey(),
    email: varchar('email').notNull().unique(),
    name: varchar('name').notNull(),
    passwordHash: text('password_hash').notNull()
})