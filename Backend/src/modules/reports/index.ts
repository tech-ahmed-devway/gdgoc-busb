import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { sessions, tracks, seasons, users } from '../../db/schema';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { resolveAuthUser, isOrganizer } from '../../middleware/auth';

export const reportRoutes = new Elysia({ prefix: '/reports' })
  // Aggregated Reporting Metrics
  .get('/summary', async ({ query, headers, jwt }) => {
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
    if (!payload?.sub) {
      throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    const user = await resolveAuthUser(payload.sub);
    if (!isOrganizer(user)) {
      throw new AppError('Only the Chapter Organizer can access chapter-wide reporting metrics', 403, 'FORBIDDEN');
    }

    const { trackId, seasonId, startDate, endDate, status, mode } = query as any;

    const conditions: any[] = [];
    if (trackId && trackId !== 'all') conditions.push(eq(sessions.trackId, trackId));
    if (seasonId && seasonId !== 'all') conditions.push(eq(sessions.seasonId, seasonId));
    if (status && status !== 'all') conditions.push(eq(sessions.workflowStatus, status));
    if (mode && mode !== 'all') conditions.push(eq(sessions.mode, mode));
    if (startDate) conditions.push(gte(sessions.startsAt, new Date(startDate)));
    if (endDate) conditions.push(lte(sessions.endsAt, new Date(endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Metrics summary
    const [summaryResult] = await db
      .select({
        total: sql<number>`count(*)::int`,
        approved: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'approved')::int`,
        pending: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'submitted')::int`,
        changesRequested: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'changes_requested')::int`,
        draft: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'draft')::int`,
        totalAttendance: sql<number>`coalesce(sum(case when ${sessions.workflowStatus} = 'approved' then ${sessions.attendanceCount} else 0 end), 0)::int`,
      })
      .from(sessions)
      .where(whereClause);

    // Track breakdown
    const trackBreakdown = await db
      .select({
        trackId: sessions.trackId,
        trackName: tracks.name,
        totalSessions: sql<number>`count(*)::int`,
        approvedSessions: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'approved')::int`,
        pendingSessions: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'submitted')::int`,
        attendance: sql<number>`coalesce(sum(case when ${sessions.workflowStatus} = 'approved' then ${sessions.attendanceCount} else 0 end), 0)::int`,
      })
      .from(sessions)
      .innerJoin(tracks, eq(sessions.trackId, tracks.id))
      .where(whereClause)
      .groupBy(sessions.trackId, tracks.name)
      .orderBy(tracks.name);

    return {
      success: true,
      data: {
        summary: summaryResult || {
          total: 0,
          approved: 0,
          pending: 0,
          changesRequested: 0,
          draft: 0,
          totalAttendance: 0,
        },
        trackBreakdown: trackBreakdown.map((tb) => ({
          ...tb,
          completionRate: tb.totalSessions > 0 ? Math.round((tb.approvedSessions / tb.totalSessions) * 100) : 0,
        })),
      },
    };
  })

  // Export CSV of sessions
  .get('/export', async ({ query, headers, jwt, set }) => {
    const authHeader = headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
    if (!payload?.sub) {
      throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
    }
    const user = await resolveAuthUser(payload.sub);
    if (!isOrganizer(user)) {
      throw new AppError('Only the Chapter Organizer can export chapter data', 403, 'FORBIDDEN');
    }

    const { trackId, seasonId, status, mode, startDate, endDate } = query as any;

    const conditions: any[] = [];
    if (trackId && trackId !== 'all') conditions.push(eq(sessions.trackId, trackId));
    if (seasonId && seasonId !== 'all') conditions.push(eq(sessions.seasonId, seasonId));
    if (status && status !== 'all') conditions.push(eq(sessions.workflowStatus, status));
    if (mode && mode !== 'all') conditions.push(eq(sessions.mode, mode));
    if (startDate) conditions.push(gte(sessions.startsAt, new Date(startDate)));
    if (endDate) conditions.push(lte(sessions.endsAt, new Date(endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sessionList = await db
      .select({
        trackName: tracks.name,
        seasonName: seasons.name,
        sessionNumber: sessions.sessionNumber,
        title: sessions.title,
        content: sessions.content,
        mode: sessions.mode,
        meetingUrl: sessions.meetingUrl,
        location: sessions.location,
        recordingUrl: sessions.recordingUrl,
        attendanceCount: sessions.attendanceCount,
        workflowStatus: sessions.workflowStatus,
        startsAt: sessions.startsAt,
        endsAt: sessions.endsAt,
        creatorName: users.fullName,
        submittedAt: sessions.submittedAt,
        reviewedAt: sessions.reviewedAt,
      })
      .from(sessions)
      .innerJoin(tracks, eq(sessions.trackId, tracks.id))
      .innerJoin(seasons, eq(sessions.seasonId, seasons.id))
      .innerJoin(users, eq(sessions.createdBy, users.id))
      .where(whereClause)
      .orderBy(tracks.name, sessions.sessionNumber);

    // Generate CSV string
    const headersList = [
      'Track',
      'Season',
      'Session #',
      'Title',
      'Format',
      'Starts At',
      'Ends At',
      'Attendance Count',
      'Status',
      'Meeting / Location',
      'Recording URL',
      'Submitted By',
      'Submitted At',
      'Reviewed At',
      'Content Covered',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sessionList.map((s) => [
      escapeCsv(s.trackName),
      escapeCsv(s.seasonName),
      escapeCsv(s.sessionNumber),
      escapeCsv(s.title),
      escapeCsv(s.mode),
      escapeCsv(s.startsAt ? new Date(s.startsAt).toISOString() : ''),
      escapeCsv(s.endsAt ? new Date(s.endsAt).toISOString() : ''),
      escapeCsv(s.attendanceCount),
      escapeCsv(s.workflowStatus),
      escapeCsv(s.mode === 'online' ? s.meetingUrl : s.location),
      escapeCsv(s.recordingUrl),
      escapeCsv(s.creatorName),
      escapeCsv(s.submittedAt ? new Date(s.submittedAt).toISOString() : ''),
      escapeCsv(s.reviewedAt ? new Date(s.reviewedAt).toISOString() : ''),
      escapeCsv(s.content),
    ]);

    const csvContent = [headersList.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const dateStr = new Date().toISOString().split('T')[0];
    set.headers['Content-Type'] = 'text/csv; charset=utf-8';
    set.headers['Content-Disposition'] = `attachment; filename="gdgoc_busb_sessions_${dateStr}.csv"`;

    return csvContent;
  });
