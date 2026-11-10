import {pgTable, uuid, jsonb, text, integer, timestamp} from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { periods } from './periods'

export const reports = pgTable('reports', {
    reportId: uuid('report_id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId, {onDelete: 'cascade'}),
    periodId: uuid('period_id').notNull().references(() => periods.periodId, {onDelete: 'cascade'}),
    snapshot: jsonb('snapshot').notNull(),
    paragraphs: jsonb('paragraphs').notNull(),
    model: text('model').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    approvedAt: timestamp('approved_at')
})