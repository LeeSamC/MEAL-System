import {pgTable, pgEnum, uuid, varchar, jsonb, text, unique} from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { revisions } from './revisions'


export const kindEnum = pgEnum('kind', [
    'workbook',
    'evidence'
])

export const extensionEnum = pgEnum('extension', [
    '.xlsx',
    '.docx',
    '.pdf'
])

export const files = pgTable('files', {
    fileId: uuid('file_id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId, {onDelete: 'cascade'}),
    revisionId: uuid('revision_id').notNull().references(() => revisions.revisionId, {onDelete: 'cascade'}),
    kind: kindEnum('kind').notNull(),
    filename: varchar('filename').notNull(),
    extension: extensionEnum('extension').notNull(),
    rowId: uuid('row_id'),
    sha256: text('sha256').notNull(),
    extraction: jsonb('extraction').notNull().default('{}'),
},
(table) => [
    unique('file_project_id').on(
        table.fileId,
        table.projectId
    ),

    unique('files_unique_revision_kind_sha256_row_idx').on(
        table.revisionId,
        table.kind,
        table.sha256,
        table.rowId
    ).nullsNotDistinct()
]
)