import { db } from '../db';
import { auditLogs } from '../db/schema';

export interface AuditParams {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actorId || null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

