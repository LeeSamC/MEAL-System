import {pgTable, uuid, varchar, timestamp, pgEnum, integer, jsonb, unique} from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { periods } from './periods'

export const entityEnum = pgEnum('entity_enum', [
    'UWI',
    'TPHL',
    'VDL'
])

export const statusEnum = pgEnum('status_enum', [
    'draft',
    'submitted',
    'verified'
])

export const revisions = pgTable('revisions', {
    revisionId: uuid('revision_id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId, {onDelete: 'cascade'}),
    periodId: uuid('period_id').notNull().references(() => periods.periodId, {onDelete: 'cascade'}),
    entity: entityEnum('entity').notNull(),
    version: integer('version').notNull(),
    status: statusEnum('status').notNull().default('draft'),
    rows: jsonb('rows').notNull().default('[]'),
    submittedAt: timestamp('submitted_at'),
    verifiedAt: timestamp('verified_at'),

},
(table) => [
    unique('period_id_entity_version').on(
        table.periodId,
        table.entity,
        table.version
    ),
    unique('revision_id_project_id').on(
        table.revisionId,
        table.projectId
    )
]
)