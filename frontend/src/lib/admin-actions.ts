import prisma from './db';
import type { Prisma } from '@prisma/client';

type AdminActionInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  videoId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export const recordAdminAction = async ({
  actorId,
  action,
  entityType,
  entityId,
  videoId,
  metadata,
}: AdminActionInput) => {
  try {
    await prisma.adminActionLog.create({
      data: {
        actorId: actorId || null,
        action,
        entityType,
        entityId: entityId || null,
        videoId: videoId || null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    console.warn('Failed to record admin action:', error);
  }
};
