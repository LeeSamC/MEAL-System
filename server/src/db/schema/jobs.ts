import {pgTable,pgEnum, uuid, text, integer, timestamp} from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { files } from './files'

export const stageEnum = pgEnum('stage', [
    'queued',
    'extracting',
    'validating',
    'ready',
    'failed'
])

export const jobs = pgTable('jobs', {
    jobId: uuid('job_id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId, {onDelete: 'cascade'}),
    fileId: uuid('file_id').notNull().unique().references(() => files.fileId, {onDelete: 'cascade'}),
    stage: stageEnum('stage').notNull().default('queued'),
    error: text('error'),
    claim: uuid('claim'),
    leaseUntil: timestamp('lease_until'),
    attempts: integer('attempts').notNull().default(0),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow()

})