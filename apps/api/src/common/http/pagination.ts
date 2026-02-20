export type ParsedPagination = {
  take: number;
  skip: number;
  cursor?: { id: string };
};

type PaginationInput = {
  take?: unknown;
  limit?: unknown;
  skip?: unknown;
  cursor?: unknown;
};

const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;

function parseIntSafe(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function parsePagination(query: PaginationInput): ParsedPagination {
  const rawTake = parseIntSafe(query.take ?? query.limit);
  const boundedTake = rawTake && rawTake > 0 ? Math.min(rawTake, MAX_TAKE) : DEFAULT_TAKE;
  const rawSkip = parseIntSafe(query.skip);
  const skip = rawSkip && rawSkip > 0 ? rawSkip : 0;
  const cursor = typeof query.cursor === 'string' && query.cursor.trim().length > 0 ? query.cursor.trim() : null;

  if (cursor) {
    return {
      take: boundedTake,
      skip: 1,
      cursor: { id: cursor }
    };
  }

  return {
    take: boundedTake,
    skip
  };
}

