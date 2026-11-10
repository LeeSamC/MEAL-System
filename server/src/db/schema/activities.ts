import {pgTable, bigint, uuid, text, jsonb, timestamp} from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { users } from './users'

export const activities = pgTable('activities', {
    activityId: bigint('activity_id', {mode: 'number'}).generatedAlwaysAsIdentity().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId, {onDelete: 'cascade'}),
    userId: uuid('user_id').notNull().references(() => users.userId, {onDelete: 'cascade'}),
    event: text('event').notNull(),
    details: jsonb('details').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
})