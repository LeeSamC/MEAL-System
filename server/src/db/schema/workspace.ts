import {pgTable, uuid, text, boolean, timestamp, unique, pgEnum} from 'drizzle-orm/pg-core'

import { users } from './users'
import { projects } from './projects'
import { entityEnum, revisions } from './revisions'

export const roleEnum = pgEnum('project_role', [
    'admin',
    'reviewer',
    'editor',
    'viewer'
])

export const members = pgTable('project_members', {
    memberId: uuid('member_id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId),
    userId: uuid('user_id').notNull().references(() => users.userId),
    role: roleEnum('role').notNull(),
    entity: entityEnum('entity'),
    active: boolean('active').notNull().default(true),
}, table => [
    unique('project_member_unique').on(
        table.projectId,
        table.userId
    )
])

export const comments = pgTable('comments', {
    commentId: uuid('comment_id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull().references(() => projects.projectId),
    revisionId: uuid('revision_id').notNull().references(() => revisions.revisionId),
    userId: uuid('user_id').notNull().references(() => users.userId),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
})

export const events = pgTable('calendar_events', {
  eventId: uuid('event_id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.projectId),
  userId: uuid('user_id').notNull().references(() => users.userId),
  title: text('title').notNull(),
  description: text('description').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
})

export const notifications = pgTable('notifications', {
  notificationId: uuid('notification_id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.projectId),
  userId: uuid('user_id').notNull().references(() => users.userId),
  dedupe: text('dedupe').notNull(),
  message: text('message').notNull(),
  entity: entityEnum('entity'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  readAt: timestamp('read_at'),
}, table => [
  unique('notification_dedupe').on(
    table.userId,
    table.projectId,
    table.dedupe,
  ),
])