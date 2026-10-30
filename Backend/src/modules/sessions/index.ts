import { Elysia, t } from 'elysia';
import { db } from '../../db';
import {
  sessions,
  tracks,
  seasons,
  users,
  sessionAssets,
  sessionReviews,
} from '../../db/schema';
import { eq, and, desc, asc, sql, ilike, or } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import {
  resolveAuthUser,
  isOrganizer,
  canAccessTrack,
  isApprovedLeader,
} from '../../middleware/auth';
import { logAudit } from '../../lib/audit';
import { StorageService } from '../../lib/storage';

export const sessionRoutes = new Elysia({ prefix: '/sessions' })
  // List sessions with filtering, pagination, and search
  .get('/', async ({ query, headers, jwt }) => {
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
    if (!payload?.sub) {
      throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    const user = await resolveAuthUser(payload.sub);
    if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const {
      trackId,
      seasonId,
      workflowStatus,
      mode,
      search,
      page = '1',
      limit = '10',
      sortBy = 'startsAt',
      sortOrder = 'desc',
    } = query as any;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    // Track Authorization enforcement
    if (isOrganizer(user)) {
      if (trackId && trackId !== 'all') {
        conditions.push(eq(sessions.trackId, trackId));
      }
    } else {
      // Head / Vice Head only sees their authorized track
      if (!user.membership?.trackId) {
        throw new AppError('No authorized track membership found', 403, 'NO_TRACK_MEMBERSHIP');
      }
      conditions.push(eq(sessions.trackId, user.membership.trackId));
    }

    if (seasonId && seasonId !== 'all') {
      conditions.push(eq(sessions.seasonId, seasonId));
    }

    if (workflowStatus && workflowStatus !== 'all') {
      conditions.push(eq(sessions.workflowStatus, workflowStatus));
    }

    if (mode && mode !== 'all') {
      conditions.push(eq(sessions.mode, mode));
    }

    if (search) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(sessions.title, searchPattern),
          ilike(sessions.content, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(whereClause);

    const total = countResult?.count || 0;

    // Sort order
    const orderColumn = sortBy === 'sessionNumber' ? sessions.sessionNumber : sessions.startsAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    // Fetch paginated sessions
    const sessionList = await db
      .select({
        id: sessions.id,
        sessionNumber: sessions.sessionNumber,
        title: sessions.title,
        content: sessions.content,
        startsAt: sessions.startsAt,
        endsAt: sessions.endsAt,
        mode: sessions.mode,
        meetingUrl: sessions.meetingUrl,
        location: sessions.location,
        recordingUrl: sessions.recordingUrl,
        attendanceCount: sessions.attendanceCount,
        notes: sessions.notes,
        workflowStatus: sessions.workflowStatus,
        trackId: sessions.trackId,
        trackName: tracks.name,
        seasonId: sessions.seasonId,
        seasonName: seasons.name,
        createdBy: sessions.createdBy,
        creatorName: users.fullName,
        submittedAt: sessions.submittedAt,
        reviewedAt: sessions.reviewedAt,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
      })
      .from(sessions)
      .innerJoin(tracks, eq(sessions.trackId, tracks.id))
      .innerJoin(seasons, eq(sessions.seasonId, seasons.id))
      .innerJoin(users, eq(sessions.createdBy, users.id))
      .where(whereClause)
      .orderBy(orderDirection)
      .limit(limitNum)
      .offset(offset);

    return {
      success: true,
      data: sessionList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  })

  // Get single session report details
  .get('/:id', async ({ params: { id }, headers, jwt }) => {
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
    if (!payload?.sub) {
      throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    const user = await resolveAuthUser(payload.sub);
    if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const [sessionRecord] = await db
      .select({
        id: sessions.id,
        sessionNumber: sessions.sessionNumber,
        title: sessions.title,
        content: sessions.content,
        startsAt: sessions.startsAt,
        endsAt: sessions.endsAt,
        mode: sessions.mode,
        meetingUrl: sessions.meetingUrl,
        location: sessions.location,
        recordingUrl: sessions.recordingUrl,
        attendanceCount: sessions.attendanceCount,
        notes: sessions.notes,
        learningOutcomes: sessions.learningOutcomes,
        challengesFaced: sessions.challengesFaced,
        workflowStatus: sessions.workflowStatus,
        trackId: sessions.trackId,
        trackName: tracks.name,
        seasonId: sessions.seasonId,
        seasonName: seasons.name,
        createdBy: sessions.createdBy,
        creatorName: users.fullName,
        submittedAt: sessions.submittedAt,
        reviewedBy: sessions.reviewedBy,
        reviewedAt: sessions.reviewedAt,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
      })
      .from(sessions)
      .innerJoin(tracks, eq(sessions.trackId, tracks.id))
      .innerJoin(seasons, eq(sessions.seasonId, seasons.id))
      .innerJoin(users, eq(sessions.createdBy, users.id))
      .where(eq(sessions.id, id))
      .limit(1);

    if (!sessionRecord) {
      throw new AppError('Session report not found', 404, 'SESSION_NOT_FOUND');
    }

    // Permission check: Organizer or leader of the session's track
    if (!canAccessTrack(user, sessionRecord.trackId)) {
      throw new AppError('You do not have permission to view this track session', 403, 'FORBIDDEN');
    }

    // Fetch assets
    const rawAssets = await db
      .select({
        id: sessionAssets.id,
        storagePath: sessionAssets.storagePath,
        fileName: sessionAssets.fileName,
        contentType: sessionAssets.contentType,
        fileSize: sessionAssets.fileSize,
        createdAt: sessionAssets.createdAt,
      })
      .from(sessionAssets)
      .where(eq(sessionAssets.sessionId, id));

    const assets = rawAssets.map((asset) => ({
      ...asset,
      url: StorageService.getPublicUrl(asset.storagePath),
    }));

    // Fetch review history
    const reviews = await db
      .select({
        id: sessionReviews.id,
        action: sessionReviews.action,
        comment: sessionReviews.comment,
        reviewerId: sessionReviews.reviewerId,
        reviewerName: users.fullName,
        createdAt: sessionReviews.createdAt,
      })
      .from(sessionReviews)
      .innerJoin(users, eq(sessionReviews.reviewerId, users.id))
      .where(eq(sessionReviews.sessionId, id))
      .orderBy(desc(sessionReviews.createdAt));

    return {
      success: true,
      data: {
        ...sessionRecord,
        assets,
        reviews,
      },
    };
  })

  // Create Session Report (Published immediately)
  .post(
    '/',
    async ({ body, headers, jwt }) => {
      const authHeader = headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
      if (!payload?.sub) {
        throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
      }
      const user = await resolveAuthUser(payload.sub);
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const {
        trackId,
        seasonId,
        sessionNumber,
        title,
        content,
        startsAt,
        endsAt,
        mode,
        meetingUrl,
        location,
        recordingUrl,
        attendanceCount = 0,
        notes,
        learningOutcomes,
        challengesFaced,
      } = body;

      // Track authorization check
      if (!canAccessTrack(user, trackId)) {
        throw new AppError('You can only create sessions for your assigned track', 403, 'FORBIDDEN_TRACK_ACCESS');
      }

      // Validate dates
      const startDate = new Date(startsAt);
      const endDate = new Date(endsAt);
      if (endDate <= startDate) {
        throw new AppError('End time must be later than start time', 400, 'INVALID_TIME_RANGE');
      }

      // Validate session number
      if (sessionNumber <= 0 || !Number.isInteger(sessionNumber)) {
        throw new AppError('Session number must be a positive integer', 400, 'INVALID_SESSION_NUMBER');
      }

      // Validate attendance
      if (attendanceCount < 0 || !Number.isInteger(attendanceCount)) {
        throw new AppError('Attendance count must be a non-negative integer', 400, 'INVALID_ATTENDANCE');
      }

      // Check online / offline conditional requirements
      if (mode === 'online' && (!meetingUrl || !meetingUrl.startsWith('http'))) {
        throw new AppError('Online sessions require a valid meeting URL', 400, 'MISSING_MEETING_URL');
      }
      if (mode === 'offline' && (!location || location.trim().length === 0)) {
        throw new AppError('Offline sessions require a physical location', 400, 'MISSING_LOCATION');
      }

      // Check uniqueness of session_number per (track_id, season_id)
      const [existingSession] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.trackId, trackId),
            eq(sessions.seasonId, seasonId),
            eq(sessions.sessionNumber, sessionNumber)
          )
        )
        .limit(1);

      if (existingSession) {
        throw new AppError(
          `Session #${sessionNumber} already exists for this track in this season`,
          409,
          'DUPLICATE_SESSION_NUMBER'
        );
      }

      // Sessions are published immediately — visible to Organizer right away
      const now = new Date();

      const [newSession] = await db
        .insert(sessions)
        .values({
          trackId,
          seasonId,
          sessionNumber,
          title: title.trim(),
          content: content.trim(),
          startsAt: startDate,
          endsAt: endDate,
          mode,
          meetingUrl: mode === 'online' ? meetingUrl?.trim() || null : null,
          location: mode === 'offline' ? location?.trim() || null : null,
          recordingUrl: recordingUrl?.trim() || null,
          attendanceCount,
          notes: notes?.trim() || null,
          learningOutcomes: learningOutcomes?.trim() || null,
          challengesFaced: challengesFaced?.trim() || null,
          workflowStatus: 'approved',
          createdBy: user.id,
          submittedAt: now,
          reviewedBy: user.id,
          reviewedAt: now,
        })
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'SESSION_PUBLISHED',
        resourceType: 'session',
        resourceId: newSession.id,
        metadata: {
          sessionNumber,
          title: newSession.title,
          trackId,
          status: 'approved',
        },
      });

      return {
        success: true,
        message: 'Session report published successfully',
        data: newSession,
      };
    },
    {
      body: t.Object({
        trackId: t.String(),
        seasonId: t.String(),
        sessionNumber: t.Integer({ minimum: 1 }),
        title: t.String({ minLength: 2, maxLength: 200 }),
        content: t.String({ minLength: 5 }),
        startsAt: t.String(),
        endsAt: t.String(),
        mode: t.Union([t.Literal('online'), t.Literal('offline')]),
        meetingUrl: t.Optional(t.String()),
        location: t.Optional(t.String()),
        recordingUrl: t.Optional(t.String()),
        attendanceCount: t.Optional(t.Integer({ minimum: 0 })),
        notes: t.Optional(t.String()),
        learningOutcomes: t.Optional(t.String()),
        challengesFaced: t.Optional(t.String()),
      }),
    }
  )

  // Update Session Report (Handles both PATCH and PUT)
  .patch(
    '/:id',
    async ({ params: { id }, body, headers, jwt }) => {
      const authHeader = headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
      if (!payload?.sub) {
        throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
      }
      const user = await resolveAuthUser(payload.sub);
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const [existing] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);

      if (!existing) {
        throw new AppError('Session report not found', 404, 'SESSION_NOT_FOUND');
      }

      // Check track authorization (Organizer or Track Head / Vice Head)
      if (!canAccessTrack(user, existing.trackId)) {
        throw new AppError('You do not have permission to modify this session', 403, 'FORBIDDEN');
      }

      const updateData: Partial<typeof sessions.$inferInsert> = {
        workflowStatus: 'approved',
        updatedAt: new Date(),
      };

      if (body.title !== undefined) updateData.title = body.title.trim();
      if (body.content !== undefined) updateData.content = body.content.trim();
      if (body.sessionNumber !== undefined) updateData.sessionNumber = body.sessionNumber;
      if (body.startsAt !== undefined) updateData.startsAt = new Date(body.startsAt);
      if (body.endsAt !== undefined) updateData.endsAt = new Date(body.endsAt);
      if (body.mode !== undefined) updateData.mode = body.mode;
      if (body.meetingUrl !== undefined) updateData.meetingUrl = body.meetingUrl?.trim() || null;
      if (body.location !== undefined) updateData.location = body.location?.trim() || null;
      if (body.recordingUrl !== undefined) updateData.recordingUrl = body.recordingUrl?.trim() || null;
      if (body.attendanceCount !== undefined) updateData.attendanceCount = body.attendanceCount;
      if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
      if (body.learningOutcomes !== undefined) updateData.learningOutcomes = body.learningOutcomes?.trim() || null;
      if (body.challengesFaced !== undefined) updateData.challengesFaced = body.challengesFaced?.trim() || null;

      const [updatedSession] = await db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.id, id))
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'SESSION_UPDATED',
        resourceType: 'session',
        resourceId: id,
        metadata: updateData,
      });

      return {
        success: true,
        message: 'Session report updated successfully',
        data: updatedSession,
      };
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        content: t.Optional(t.String()),
        sessionNumber: t.Optional(t.Integer({ minimum: 1 })),
        startsAt: t.Optional(t.String()),
        endsAt: t.Optional(t.String()),
        mode: t.Optional(t.Union([t.Literal('online'), t.Literal('offline')])),
        meetingUrl: t.Optional(t.String()),
        location: t.Optional(t.String()),
        recordingUrl: t.Optional(t.String()),
        attendanceCount: t.Optional(t.Integer({ minimum: 0 })),
        notes: t.Optional(t.String()),
        learningOutcomes: t.Optional(t.String()),
        challengesFaced: t.Optional(t.String()),
      }),
    }
  )

  .put(
    '/:id',
    async ({ params: { id }, body, headers, jwt }) => {
      const authHeader = headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
      if (!payload?.sub) {
        throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
      }
      const user = await resolveAuthUser(payload.sub);
      if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const [existing] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);

      if (!existing) {
        throw new AppError('Session report not found', 404, 'SESSION_NOT_FOUND');
      }

      if (!canAccessTrack(user, existing.trackId)) {
        throw new AppError('You do not have permission to modify this session', 403, 'FORBIDDEN');
      }

      const updateData: Partial<typeof sessions.$inferInsert> = {
        workflowStatus: 'approved',
        updatedAt: new Date(),
      };

      if (body.title !== undefined) updateData.title = body.title.trim();
      if (body.content !== undefined) updateData.content = body.content.trim();
      if (body.sessionNumber !== undefined) updateData.sessionNumber = body.sessionNumber;
      if (body.startsAt !== undefined) updateData.startsAt = new Date(body.startsAt);
      if (body.endsAt !== undefined) updateData.endsAt = new Date(body.endsAt);
      if (body.mode !== undefined) updateData.mode = body.mode;
      if (body.meetingUrl !== undefined) updateData.meetingUrl = body.meetingUrl?.trim() || null;
      if (body.location !== undefined) updateData.location = body.location?.trim() || null;
      if (body.recordingUrl !== undefined) updateData.recordingUrl = body.recordingUrl?.trim() || null;
      if (body.attendanceCount !== undefined) updateData.attendanceCount = body.attendanceCount;
      if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
      if (body.learningOutcomes !== undefined) updateData.learningOutcomes = body.learningOutcomes?.trim() || null;
      if (body.challengesFaced !== undefined) updateData.challengesFaced = body.challengesFaced?.trim() || null;

      const [updatedSession] = await db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.id, id))
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'SESSION_UPDATED',
        resourceType: 'session',
        resourceId: id,
        metadata: updateData,
      });

      return {
        success: true,
        message: 'Session report updated successfully',
        data: updatedSession,
      };
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        content: t.Optional(t.String()),
        sessionNumber: t.Optional(t.Integer({ minimum: 1 })),
        startsAt: t.Optional(t.String()),
        endsAt: t.Optional(t.String()),
        mode: t.Optional(t.Union([t.Literal('online'), t.Literal('offline')])),
        meetingUrl: t.Optional(t.String()),
        location: t.Optional(t.String()),
        recordingUrl: t.Optional(t.String()),
        attendanceCount: t.Optional(t.Integer({ minimum: 0 })),
        notes: t.Optional(t.String()),
        learningOutcomes: t.Optional(t.String()),
        challengesFaced: t.Optional(t.String()),
      }),
    }
  );
