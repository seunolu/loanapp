import type { Request } from 'express';

export type RequestWithId = Request & {
  id?: string;
  requestId?: string;
  rawBody?: Buffer;
  logContext?: {
    requestId: string;
    tenantId: string | null;
    actorType: 'TENANT_ADMIN' | 'BORROWER' | 'SYSTEM' | null;
    actorId: string | null;
  };
  user?: unknown;
};
