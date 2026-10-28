import { Elysia } from 'elysia';
import { db } from '../../db';
import { tracks, memberships, users, sessions, seasons } from '../../db/schema';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { resolveAuthUser, isOrganizer } from '../../middleware/auth';

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' })
  .get('/summary', async ({ headers, jwt }) => {
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

    // === ORGANIZER DASHBOARD ===
    if (isOrganizer(user)) {
      // 1. Total active tracks
      const [trackCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tracks)
        .where(eq(tracks.status, 'active'));

      // 2. Active memberships
      const [activeMembersCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(memberships)
        .where(eq(memberships.status, 'approved'));

      // 3. Pending approvals
      const [pendingApprovalsCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(memberships)
        .where(eq(memberships.status, 'pending'));

      // 4. Session metrics breakdown by status
      const statusCounts = await db
        .select({
          status: sessions.workflowStatus,
          count: sql<number>`count(*)::int`,
          totalAttendance: sql<number>`coalesce(sum(${sessions.attendanceCount}), 0)::int`,
        })
        .from(sessions)
        .groupBy(sessions.workflowStatus);

      let totalSessions = 0;
      let draftSessions = 0;
      let submittedSessions = 0;
      let changesRequestedSessions = 0;
      let approvedSessions = 0;
      let approvedAttendance = 0;

      statusCounts.forEach((s) => {
        totalSessions += s.count;
        if (s.status === 'draft') draftSessions = s.count;
        if (s.status === 'submitted') submittedSessions = s.count;
        if (s.status === 'changes_requested') changesRequestedSessions = s.count;
        if (s.status === 'approved') {
          approvedSessions = s.count;
          approvedAttendance = s.totalAttendance;
        }
      });

      // 5. Track operational overview
      const allActiveTracks = await db
        .select({
          id: tracks.id,
          name: tracks.name,
          description: tracks.description,
          status: tracks.status,
        })
        .from(tracks)
        .where(eq(tracks.status, 'active'))
        .orderBy(tracks.name);

      const trackMembers = await db
        .select({
          trackId: memberships.trackId,
          role: memberships.role,
          fullName: users.fullName,
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.status, 'approved'));

      const trackSessionsData = await db
        .select({
          trackId: sessions.trackId,
          total: sql<number>`count(*)::int`,
          approved: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'approved')::int`,
          pendingReview: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'submitted')::int`,
          changesRequested: sql<number>`count(*) filter (where ${sessions.workflowStatus} = 'changes_requested')::int`,
          lastSessionDate: sql<string>`max(${sessions.startsAt})::text`,
        })
        .from(sessions)
        .groupBy(sessions.trackId);

      const trackSessionMap = new Map<string, any>();
      trackSessionsData.forEach((tsd) => trackSessionMap.set(tsd.trackId, tsd));

      const leadersMap = new Map<string, { head?: string; viceHead?: string }>();
      trackMembers.forEach((tm) => {
        const cur = leadersMap.get(tm.trackId) || {};
        if (tm.role === 'head') cur.head = tm.fullName;
        if (tm.role === 'vice_head') cur.viceHead = tm.fullName;
        leadersMap.set(tm.trackId, cur);
      });

      const trackOverview = allActiveTracks.map((t) => {
        const stats = trackSessionMap.get(t.id) || {
          total: 0,
          approved: 0,
          pendingReview: 0,
          changesRequested: 0,
          lastSessionDate: null,
        };
        const leaders = leadersMap.get(t.id) || {};
        return {
          id: t.id,
          name: t.name,
          head: leaders.head || null,
          viceHead: leaders.viceHead || null,
          totalSessions: stats.total,
          approvedSessions: stats.approved,
          pendingReviewSessions: stats.pendingReview,
          changesRequestedSessions: stats.changesRequested,
          lastSessionDate: stats.lastSessionDate,
          completionRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
        };
      });

      // 6. Recent pending applications (preview)
      const recentPendingApprovals = await db
        .select({
          id: memberships.id,
          fullName: users.fullName,
          email: users.email,
          role: memberships.role,
          trackName: tracks.name,
          requestedAt: memberships.requestedAt,
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .innerJoin(tracks, eq(memberships.trackId, tracks.id))
        .where(eq(memberships.status, 'pending'))
        .orderBy(desc(memberships.requestedAt))
        .limit(5);

      // 7. Recent session activities
      const recentSessionActivities = await db
        .select({
          id: sessions.id,
          sessionNumber: sessions.sessionNumber,
          title: sessions.title,
          workflowStatus: sessions.workflowStatus,
          trackName: tracks.name,
          creatorName: users.fullName,
          updatedAt: sessions.updatedAt,
        })
        .from(sessions)
        .innerJoin(tracks, eq(sessions.trackId, tracks.id))
        .innerJoin(users, eq(sessions.createdBy, users.id))
        .orderBy(desc(sessions.updatedAt))
        .limit(6);

      return {
        success: true,
        data: {
          role: 'organizer',
          summary: {
            activeTracks: trackCount?.count || 0,
            activeMembers: activeMembersCount?.count || 0,
            pendingApprovals: pendingApprovalsCount?.count || 0,
            totalSessions,
            draftSessions,
            submittedSessions,
            changesRequestedSessions,
            approvedSessions,
            approvedAttendance,
          },
          trackOverview,
          recentPendingApprovals,
          recentSessionActivities,
        },
      };
    }

    // === HEAD / VICE HEAD DASHBOARD ===
    const userTrackId = user.membership?.trackId;
    if (!userTrackId) {
      throw new AppError('No authorized track assigned to your profile', 403, 'NO_TRACK_ASSIGNED');
    }

    const [trackInfo] = await db
      .select()
      .from(tracks)
      .where(eq(tracks.id, userTrackId))
      .limit(1);

    // Track session counts for assigned track
    const trackStatusCounts = await db
      .select({
        status: sessions.workflowStatus,
        count: sql<number>`count(*)::int`,
        attendance: sql<number>`coalesce(sum(${sessions.attendanceCount}), 0)::int`,
      })
      .from(sessions)
      .where(eq(sessions.trackId, userTrackId))
      .groupBy(sessions.workflowStatus);

    let myTotalSessions = 0;
    let myDrafts = 0;
    let mySubmitted = 0;
    let myChangesRequested = 0;
    let myApproved = 0;
    let myAttendance = 0;

    trackStatusCounts.forEach((s) => {
      myTotalSessions += s.count;
      if (s.status === 'draft') myDrafts = s.count;
      if (s.status === 'submitted') mySubmitted = s.count;
      if (s.status === 'changes_requested') myChangesRequested = s.count;
      if (s.status === 'approved') {
        myApproved = s.count;
        myAttendance = s.attendance;
      }
    });

    // Recent activity in their track
    const myRecentSessions = await db
      .select({
        id: sessions.id,
        sessionNumber: sessions.sessionNumber,
        title: sessions.title,
        workflowStatus: sessions.workflowStatus,
        startsAt: sessions.startsAt,
        attendanceCount: sessions.attendanceCount,
        updatedAt: sessions.updatedAt,
      })
      .from(sessions)
      .where(eq(sessions.trackId, userTrackId))
      .orderBy(desc(sessions.updatedAt))
      .limit(5);

    // Resumable drafts
    const draftSessions = await db
      .select({
        id: sessions.id,
        sessionNumber: sessions.sessionNumber,
        title: sessions.title,
        updatedAt: sessions.updatedAt,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.trackId, userTrackId),
          or(eq(sessions.workflowStatus, 'draft'), eq(sessions.workflowStatus, 'changes_requested'))
        )
      )
      .orderBy(desc(sessions.updatedAt))
      .limit(5);

    return {
      success: true,
      data: {
        role: user.role,
        track: {
          id: trackInfo?.id,
          name: trackInfo?.name,
          role: user.membership?.role,
        },
        summary: {
          totalSessions: myTotalSessions,
          drafts: myDrafts,
          submitted: mySubmitted,
          changesRequested: myChangesRequested,
          approved: myApproved,
          approvedAttendance: myAttendance,
        },
        recentSessions: myRecentSessions,
        resumableDrafts: draftSessions,
      },
    };
  });
