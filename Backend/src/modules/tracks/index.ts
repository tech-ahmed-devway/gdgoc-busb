import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { tracks, memberships, users, sessions } from '../../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { resolveAuthUser, isOrganizer } from '../../middleware/auth';
import { logAudit } from '../../lib/audit';

export const trackRoutes = new Elysia({ prefix: '/tracks' })
  // List all tracks with leaders and session counts
  .get('/', async ({ headers, jwt }) => {
    // Public / authenticated listing
    const allTracks = await db
      .select({
        id: tracks.id,
        name: tracks.name,
        description: tracks.description,
        status: tracks.status,
        createdAt: tracks.createdAt,
        updatedAt: tracks.updatedAt,
      })
      .from(tracks)
      .orderBy(tracks.name);

    // Fetch approved leaders for each track
    const activeMembers = await db
      .select({
        trackId: memberships.trackId,
        role: memberships.role,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.status, 'approved'));

    // Count sessions per track
    const sessionCounts = await db
      .select({
        trackId: sessions.trackId,
        count: sql<number>`count(*)::int`,
      })
      .from(sessions)
      .groupBy(sessions.trackId);

    const countMap = new Map<string, number>();
    sessionCounts.forEach((c) => countMap.set(c.trackId, c.count));

    const leadersByTrack = new Map<string, { head?: any; viceHead?: any }>();
    activeMembers.forEach((m) => {
      const current = leadersByTrack.get(m.trackId) || {};
      if (m.role === 'head') current.head = m;
      else if (m.role === 'vice_head') current.viceHead = m;
      leadersByTrack.set(m.trackId, current);
    });

    const result = allTracks.map((t) => {
      const leaders = leadersByTrack.get(t.id) || {};
      return {
        ...t,
        head: leaders.head || null,
        viceHead: leaders.viceHead || null,
        sessionCount: countMap.get(t.id) || 0,
      };
    });

    return {
      success: true,
      data: result,
    };
  })

  // Get Track Details
  .get('/:id', async ({ params: { id } }) => {
    const [track] = await db
      .select()
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);

    if (!track) {
      throw new AppError('Track not found', 404, 'TRACK_NOT_FOUND');
    }

    const members = await db
      .select({
        id: memberships.id,
        role: memberships.role,
        status: memberships.status,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        requestedAt: memberships.requestedAt,
        approvedAt: memberships.approvedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.trackId, id));

    return {
      success: true,
      data: {
        ...track,
        members,
      },
    };
  })

  // Create Track (Organizer only)
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
      if (!isOrganizer(user)) {
        throw new AppError('Only the Chapter Organizer can create tracks', 403, 'FORBIDDEN');
      }

      // Check unique name
      const [existing] = await db
        .select()
        .from(tracks)
        .where(eq(tracks.name, body.name.trim()))
        .limit(1);

      if (existing) {
        throw new AppError('A track with this name already exists', 409, 'TRACK_EXISTS');
      }

      const [newTrack] = await db
        .insert(tracks)
        .values({
          name: body.name.trim(),
          description: body.description?.trim() || null,
          status: 'active',
        })
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'TRACK_CREATED',
        resourceType: 'track',
        resourceId: newTrack.id,
        metadata: { name: newTrack.name },
      });

      return {
        success: true,
        message: 'Track created successfully',
        data: newTrack,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 100 }),
        description: t.Optional(t.String()),
      }),
    }
  )

  // Update Track (Organizer only)
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
      if (!isOrganizer(user)) {
        throw new AppError('Only the Chapter Organizer can update tracks', 403, 'FORBIDDEN');
      }

      const [existingTrack] = await db
        .select()
        .from(tracks)
        .where(eq(tracks.id, id))
        .limit(1);

      if (!existingTrack) {
        throw new AppError('Track not found', 404, 'TRACK_NOT_FOUND');
      }

      const updateData: Partial<typeof tracks.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.description !== undefined) updateData.description = body.description?.trim() || null;
      if (body.status !== undefined) updateData.status = body.status;

      const [updatedTrack] = await db
        .update(tracks)
        .set(updateData)
        .where(eq(tracks.id, id))
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'TRACK_UPDATED',
        resourceType: 'track',
        resourceId: id,
        metadata: updateData,
      });

      return {
        success: true,
        message: 'Track updated successfully',
        data: updatedTrack,
      };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        description: t.Optional(t.String()),
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('archived')])),
      }),
    }
  );
