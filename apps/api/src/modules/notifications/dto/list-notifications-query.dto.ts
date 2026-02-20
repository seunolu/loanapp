import { NotificationRecordStatus } from '@prisma/client';
import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  status: z.nativeEnum(NotificationRecordStatus).optional()
}).strict();

export type ListNotificationsQueryDto = z.infer<typeof listNotificationsQuerySchema>;
