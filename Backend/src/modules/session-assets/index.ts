import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { sessions, sessionAssets } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { resolveAuthUser, canAccessTrack } from '../../middleware/auth';
import { StorageService } from '../../lib/storage';
import { logAudit } from '../../lib/audit';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const sessionAssetRoutes = new Elysia()
  // Upload session asset (photo / attachment)
  .post(
    '/sessions/:id/assets',
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

      const [sessionRecord] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);

      if (!sessionRecord) {
        throw new AppError('Session report not found', 404, 'SESSION_NOT_FOUND');
      }

      if (!canAccessTrack(user, sessionRecord.trackId)) {
        throw new AppError('You do not have permission to upload assets for this session', 403, 'FORBIDDEN');
      }

      const file = (body as any).file as File;
      if (!file) {
        throw new AppError('No file provided', 400, 'FILE_MISSING');
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new AppError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF', 400, 'INVALID_FILE_TYPE');
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new AppError('File size exceeds the 10MB limit', 400, 'FILE_TOO_LARGE');
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await StorageService.upload({
        fileName: file.name,
        contentType: file.type,
        buffer,
        folder: `session-${id}`,
      });

      const [newAsset] = await db
        .insert(sessionAssets)
        .values({
          sessionId: id,
          storagePath: uploadResult.storagePath,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          uploadedBy: user.id,
        })
        .returning();

      await logAudit({
        actorId: user.id,
        action: 'ASSET_UPLOADED',
        resourceType: 'session_asset',
        resourceId: newAsset.id,
        metadata: {
          sessionId: id,
          fileName: file.name,
          storagePath: uploadResult.storagePath,
        },
      });

      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          ...newAsset,
          url: uploadResult.publicUrl,
        },
      };
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  )

  // Delete session asset
  .delete('/assets/:id', async ({ params: { id }, headers, jwt }) => {
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

    const [asset] = await db
      .select({
        id: sessionAssets.id,
        sessionId: sessionAssets.sessionId,
        storagePath: sessionAssets.storagePath,
        trackId: sessions.trackId,
      })
      .from(sessionAssets)
      .innerJoin(sessions, eq(sessionAssets.sessionId, sessions.id))
      .where(eq(sessionAssets.id, id))
      .limit(1);

    if (!asset) {
      throw new AppError('Asset not found', 404, 'ASSET_NOT_FOUND');
    }

    if (!canAccessTrack(user, asset.trackId)) {
      throw new AppError('You do not have permission to delete this asset', 403, 'FORBIDDEN');
    }

    try {
      await StorageService.delete(asset.storagePath);
    } catch (e) {
      console.warn('Storage delete warning:', e);
    }

    await db.delete(sessionAssets).where(eq(sessionAssets.id, id));

    await logAudit({
      actorId: user.id,
      action: 'ASSET_DELETED',
      resourceType: 'session_asset',
      resourceId: id,
    });

    return {
      success: true,
      message: 'Asset deleted successfully',
    };
  })

  // Local development file server for uploaded assets
  .get('/assets/local/:filename', async ({ params: { filename }, set }) => {
    const safeFilename = path.basename(filename);
    const localPath = path.resolve(process.cwd(), 'uploads', safeFilename);

    if (!fs.existsSync(localPath)) {
      set.status = 404;
      return { error: 'File not found' };
    }

    const file = Bun.file(localPath);
    return file;
  });
