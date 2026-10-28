import { Elysia } from 'elysia';
import { db } from '../../db';
import { auditLogs, users } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { resolveAuthUser, isOrganizer } from '../../middleware/auth';

export const auditRoutes = new Elysia({ prefix: '/audit' })
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
    if (!isOrganizer(user)) {
      throw new AppError('Only the Chapter Organizer can inspect audit logs', 403, 'FORBIDDEN');
    }

    const { limit = '50', action } = query as any;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const queryBuilder = db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorId: auditLogs.actorId,
        actorName: users.fullName,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limitNum);

    const logs = await queryBuilder;

    return {
      success: true,
      data: logs,
    };
  })

  // Delete all audit logs (Organizer only)
  .delete('/all', async ({ headers, jwt }) => {
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
      throw new AppError('Only the Chapter Organizer can clear audit logs', 403, 'FORBIDDEN');
    }

    await db.delete(auditLogs);

    return {
      success: true,
      message: 'All audit logs deleted successfully',
    };
  })

  // Delete single audit log by ID (Organizer only)
  .delete('/:id', async ({ params: { id }, headers, jwt }) => {
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
      throw new AppError('Only the Chapter Organizer can delete audit logs', 403, 'FORBIDDEN');
    }

    const [deleted] = await db
      .delete(auditLogs)
      .where(eq(auditLogs.id, id))
      .returning();

    if (!deleted) {
      throw new AppError('Audit log not found', 404, 'AUDIT_LOG_NOT_FOUND');
    }

    return {
      success: true,
      message: 'Audit log deleted successfully',
    };
  });
