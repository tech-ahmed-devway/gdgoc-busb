import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- Users Table ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  authUserId: text('auth_user_id'),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('head'), // 'organizer', 'head', 'vice_head'
  accountStatus: text('account_status').notNull().default('pending'), // 'pending', 'approved', 'rejected', 'suspended'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Tracks Table ---
export const tracks = pgTable('tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  status: text('status').notNull().default('active'), // 'active', 'archived'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Seasons Table ---
export const seasons = pgTable('seasons', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').notNull().default(false),
  status: text('status').notNull().default('active'), // 'active', 'archived'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Memberships Table ---
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'head', 'vice_head'
    status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected', 'suspended'
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('memberships_user_idx').on(table.userId),
    trackIdx: index('memberships_track_idx').on(table.trackId),
    statusIdx: index('memberships_status_idx').on(table.status),
  })
);

// --- Sessions Table ---
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    trackId: uuid('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    seasonId: uuid('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    sessionNumber: integer('session_number').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    mode: text('mode').notNull().default('offline'), // 'online', 'offline'
    meetingUrl: text('meeting_url'),
    location: text('location'),
    recordingUrl: text('recording_url'),
    attendanceCount: integer('attendance_count').notNull().default(0),
    notes: text('notes'),
    learningOutcomes: text('learning_outcomes'),
    challengesFaced: text('challenges_faced'),
    workflowStatus: text('workflow_status').notNull().default('draft'), // 'draft', 'submitted', 'under_review', 'changes_requested', 'approved'
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    trackSeasonNumberIdx: uniqueIndex('track_season_session_unique_idx').on(
      table.trackId,
      table.seasonId,
      table.sessionNumber
    ),
    trackIdx: index('sessions_track_idx').on(table.trackId),
    seasonIdx: index('sessions_season_idx').on(table.seasonId),
    statusIdx: index('sessions_status_idx').on(table.workflowStatus),
    attendanceCheck: check('attendance_count_non_negative', sql`${table.attendanceCount} >= 0`),
  })
);

// --- Session Assets Table ---
export const sessionAssets = pgTable(
  'session_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    storagePath: text('storage_path').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    fileSize: integer('file_size').notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index('session_assets_session_idx').on(table.sessionId),
  })
);

// --- Session Reviews Table ---
export const sessionReviews = pgTable(
  'session_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(), // 'approved', 'changes_requested', 'commented'
    comment: text('comment').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index('session_reviews_session_idx').on(table.sessionId),
  })
);

// --- Audit Logs Table ---
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(), // 'USER_REGISTERED', 'MEMBERSHIP_APPROVED', 'MEMBERSHIP_REJECTED', 'SESSION_CREATED', 'SESSION_SUBMITTED', 'SESSION_APPROVED', 'SESSION_CHANGES_REQUESTED', etc.
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    actorIdx: index('audit_logs_actor_idx').on(table.actorId),
    resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    createdIdx: index('audit_logs_created_idx').on(table.createdAt),
  })
);

// --- Password Resets Table ---
export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('password_resets_user_idx').on(table.userId),
    tokenIdx: index('password_resets_token_idx').on(table.tokenHash),
  })
);

// --- Drizzle Relations ---
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships, { relationName: 'userMemberships' }),
  approvedMemberships: many(memberships, { relationName: 'approvedMemberships' }),
  sessionsCreated: many(sessions, { relationName: 'createdSessions' }),
  sessionsReviewed: many(sessions, { relationName: 'reviewedSessions' }),
  auditLogs: many(auditLogs),
}));

export const tracksRelations = relations(tracks, ({ many }) => ({
  memberships: many(memberships),
  sessions: many(sessions),
}));

export const seasonsRelations = relations(seasons, ({ many }) => ({
  sessions: many(sessions),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
    relationName: 'userMemberships',
  }),
  track: one(tracks, {
    fields: [memberships.trackId],
    references: [tracks.id],
  }),
  approver: one(users, {
    fields: [memberships.approvedBy],
    references: [users.id],
    relationName: 'approvedMemberships',
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  track: one(tracks, {
    fields: [sessions.trackId],
    references: [tracks.id],
  }),
  season: one(seasons, {
    fields: [sessions.seasonId],
    references: [seasons.id],
  }),
  creator: one(users, {
    fields: [sessions.createdBy],
    references: [users.id],
    relationName: 'createdSessions',
  }),
  reviewer: one(users, {
    fields: [sessions.reviewedBy],
    references: [users.id],
    relationName: 'reviewedSessions',
  }),
  assets: many(sessionAssets),
  reviews: many(sessionReviews),
}));

export const sessionAssetsRelations = relations(sessionAssets, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionAssets.sessionId],
    references: [sessions.id],
  }),
  uploader: one(users, {
    fields: [sessionAssets.uploadedBy],
    references: [users.id],
  }),
}));

export const sessionReviewsRelations = relations(sessionReviews, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionReviews.sessionId],
    references: [sessions.id],
  }),
  reviewer: one(users, {
    fields: [sessionReviews.reviewerId],
    references: [users.id],
  }),
}));

