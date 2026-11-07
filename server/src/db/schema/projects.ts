import {pgTable, uuid, varchar, timestamp} from 'drizzle-orm/pg-core'
import { users } from './users'

export const projects = pgTable('projects', {
    projectId: uuid('project_id').defaultRandom().primaryKey(),
    name: varchar('name').notNull(),
    ownerId: uuid('owner_id').notNull().references(() => users.userId, {onDelete: 'cascade'}),
    createdAt: timestamp('created_at').notNull().defaultNow()
})