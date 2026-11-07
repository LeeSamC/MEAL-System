import {pgTable, uuid, varchar, timestamp, jsonb, unique} from 'drizzle-orm/pg-core'
import { projects } from './projects'

export const periods = pgTable('periods', {
    periodId: uuid('period_id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId, {onDelete: 'cascade'}),
    name: varchar('name').notNull(),
    deadline: timestamp('deadline').notNull(),
    definitions: jsonb('definitions').notNull(),
},
(table) => [
    unique('unique_project_id_name').on(
        table.projectId,
        table.name
    ),
    unique('unique_period_id_project_id').on(
        table.periodId,
        table.projectId
    )

]
)