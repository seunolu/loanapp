import { BadRequestException } from '@nestjs/common';

export type CursorPayload = {
  createdAt: Date;
  id: string;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

type DecodedCursor = {
  createdAt: string;
  id: string;
};

export function encodeCursor(payload: CursorPayload): string {
  const raw: DecodedCursor = {
    createdAt: payload.createdAt.toISOString(),
    id: payload.id
  };
  return Buffer.from(JSON.stringify(raw), 'utf8').toString('base64url');
}

export function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as DecodedCursor;
    const createdAt = new Date(decoded.createdAt);
    if (!decoded.id || Number.isNaN(createdAt.getTime())) {
      throw new Error('Invalid cursor payload');
    }
    return { id: decoded.id, createdAt };
  } catch {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Invalid cursor.',
      details: null
    });
  }
}

export function buildDescCreatedAtCursorWhere(cursor: CursorPayload | null) {
  if (!cursor) {
    return undefined;
  }

  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } }
    ]
  };
}

