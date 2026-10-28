import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { seasons } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { resolveAuthUser, isOrganizer } from '../../middleware/auth';
import { logAudit } from '../../lib/audit';

export const seasonRoutes = new Elysia({ prefix: '/seasons' })
  // List all seasons
  .get('/', async () => {
    const allSeasons = await db
      .select()
      .from(seasons)
      .orderBy(desc(seasons.startsAt));

    return {
      success: true,
      data: allSeasons,
    };
  })

  // Create Season (Organizer only)
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
        throw new AppError('Only the Chapter Organizer can create seasons', 403, 'FORBIDDEN');
      }

      const startsAt = new Date(body.startsAt);
      const endsAt = new Date(body.endsAt);

      if (endsAt <= startsAt) {
        throw new AppError('Season end date must be after start date', 400, 'INVALID_DATE_RANGE');
      }

      // If isActive is true, set all other seasons isActive to false
      if (body.isActive) {
        await db.update(seasons).set({ isActive: false });
      }

      const [newSeason] = await db
        .insert(seasons)
        .values({
          name: body.name.trim(),
          startsAt,
          endsAt,
          isActive: body.isActive ?? false,
          status: 'active',
        })
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'SEASON_CREATED',
        resourceType: 'season',
        resourceId: newSeason.id,
        metadata: { name: newSeason.name },
      });

      return {
        success: true,
        message: 'Season created successfully',
        data: newSeason,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 100 }),
        startsAt: t.String(),
        endsAt: t.String(),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  // Update Season (Organizer only)
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
        throw new AppError('Only the Chapter Organizer can update seasons', 403, 'FORBIDDEN');
      }

      const [existing] = await db
        .select()
        .from(seasons)
        .where(eq(seasons.id, id))
        .limit(1);

      if (!existing) {
        throw new AppError('Season not found', 404, 'SEASON_NOT_FOUND');
      }

      if (body.isActive) {
        await db.update(seasons).set({ isActive: false });
      }

      const updateData: Partial<typeof seasons.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.startsAt !== undefined) updateData.startsAt = new Date(body.startsAt);
      if (body.endsAt !== undefined) updateData.endsAt = new Date(body.endsAt);
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.status !== undefined) updateData.status = body.status;

      if (updateData.startsAt && updateData.endsAt && updateData.endsAt <= updateData.startsAt) {
        throw new AppError('Season end date must be after start date', 400, 'INVALID_DATE_RANGE');
      }

      const [updated] = await db
        .update(seasons)
        .set(updateData)
        .where(eq(seasons.id, id))
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'SEASON_UPDATED',
        resourceType: 'season',
        resourceId: id,
        metadata: updateData,
      });

      return {
        success: true,
        message: 'Season updated successfully',
        data: updated,
      };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        startsAt: t.Optional(t.String()),
        endsAt: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('archived')])),
      }),
    }
  );
