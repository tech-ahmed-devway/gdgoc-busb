import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { memberships, users, tracks } from '../../db/schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { resolveAuthUser, isOrganizer } from '../../middleware/auth';
import { logAudit } from '../../lib/audit';

export const approvalRoutes = new Elysia()
  // List approval queue (Organizer only)
  .get('/approvals', async ({ query, headers, jwt }) => {
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
      throw new AppError('Only the Chapter Organizer can access the approval queue', 403, 'FORBIDDEN');
    }

    const { status = 'pending', trackId, search } = query as any;

    let conditions: any[] = [];

    if (status && status !== 'all') {
      conditions.push(eq(memberships.status, status));
    }

    if (trackId) {
      conditions.push(eq(memberships.trackId, trackId));
    }

    const approvalQuery = db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        fullName: users.fullName,
        email: users.email,
        role: memberships.role,
        trackId: memberships.trackId,
        trackName: tracks.name,
        status: memberships.status,
        requestedAt: memberships.requestedAt,
        approvedAt: memberships.approvedAt,
        approvedBy: memberships.approvedBy,
        rejectionReason: memberships.rejectionReason,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(tracks, eq(memberships.trackId, tracks.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(memberships.requestedAt));

    const records = await approvalQuery;

    // Filter in-memory for search if provided
    let filtered = records;
    if (search) {
      const s = search.toLowerCase();
      filtered = records.filter(
        (r) =>
          r.fullName.toLowerCase().includes(s) ||
          r.email.toLowerCase().includes(s) ||
          r.trackName.toLowerCase().includes(s)
      );
    }

    return {
      success: true,
      data: filtered,
    };
  })

  // Approve registration request (Organizer only)
  .post(
    '/approvals/:id/approve',
    async ({ params: { id }, headers, jwt }) => {
      const authHeader = headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
      if (!payload?.sub) {
        throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
      }
      const organizer = await resolveAuthUser(payload.sub);
      if (!isOrganizer(organizer)) {
        throw new AppError('Only the Chapter Organizer can approve registrations', 403, 'FORBIDDEN');
      }

      const [membership] = await db
        .select()
        .from(memberships)
        .where(eq(memberships.id, id))
        .limit(1);

      if (!membership) {
        throw new AppError('Application request not found', 404, 'APPLICATION_NOT_FOUND');
      }

      if (membership.status === 'approved') {
        throw new AppError('This application has already been approved', 400, 'ALREADY_APPROVED');
      }

      const now = new Date();

      // Transactionally approve membership and user account
      await db.transaction(async (tx) => {
        await tx
          .update(memberships)
          .set({
            status: 'approved',
            approvedBy: organizer.id,
            approvedAt: now,
            rejectionReason: null,
            updatedAt: now,
          })
          .where(eq(memberships.id, id));

        await tx
          .update(users)
          .set({
            accountStatus: 'approved',
            role: membership.role,
            updatedAt: now,
          })
          .where(eq(users.id, membership.userId));
      });

      await logAudit({
        actorId: organizer.id,
        action: 'MEMBERSHIP_APPROVED',
        resourceType: 'membership',
        resourceId: id,
        metadata: {
          userId: membership.userId,
          trackId: membership.trackId,
          role: membership.role,
        },
      });

      return {
        success: true,
        message: 'Applicant approved successfully. Account is now active.',
      };
    }
  )

  // Reject registration request (Organizer only)
  .post(
    '/approvals/:id/reject',
    async ({ params: { id }, body, headers, jwt }) => {
      const authHeader = headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      const payload = (await (jwt as any).verify(authHeader.substring(7))) as { sub: string } | null;
      if (!payload?.sub) {
        throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
      }
      const organizer = await resolveAuthUser(payload.sub);
      if (!isOrganizer(organizer)) {
        throw new AppError('Only the Chapter Organizer can reject registrations', 403, 'FORBIDDEN');
      }

      const [membership] = await db
        .select()
        .from(memberships)
        .where(eq(memberships.id, id))
        .limit(1);

      if (!membership) {
        throw new AppError('Application request not found', 404, 'APPLICATION_NOT_FOUND');
      }

      const now = new Date();
      const reason = body?.reason?.trim() || 'Did not meet requirements';

      await db.transaction(async (tx) => {
        await tx
          .update(memberships)
          .set({
            status: 'rejected',
            rejectionReason: reason,
            updatedAt: now,
          })
          .where(eq(memberships.id, id));

        await tx
          .update(users)
          .set({
            accountStatus: 'rejected',
            updatedAt: now,
          })
          .where(eq(users.id, membership.userId));
      });

      await logAudit({
        actorId: organizer.id,
        action: 'MEMBERSHIP_REJECTED',
        resourceType: 'membership',
        resourceId: id,
        metadata: {
          userId: membership.userId,
          trackId: membership.trackId,
          reason,
        },
      });

      return {
        success: true,
        message: 'Applicant rejected. Application history has been preserved.',
      };
    },
    {
      body: t.Optional(
        t.Object({
          reason: t.Optional(t.String()),
        })
      ),
    }
  )

  // Memberships List
  .get('/memberships', async ({ headers, jwt }) => {
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

    const query = db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        fullName: users.fullName,
        email: users.email,
        role: memberships.role,
        trackId: memberships.trackId,
        trackName: tracks.name,
        status: memberships.status,
        requestedAt: memberships.requestedAt,
        approvedAt: memberships.approvedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(tracks, eq(memberships.trackId, tracks.id));

    // If not organizer, filter by user's own membership
    const results = isOrganizer(user)
      ? await query.orderBy(desc(memberships.createdAt))
      : await query.where(eq(memberships.userId, user.id));

    return {
      success: true,
      data: results,
    };
  });
