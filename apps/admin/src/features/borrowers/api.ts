import { proxyRequest } from '@/lib/api/web-client';

export type BorrowerListItem = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

export type BorrowerListResponse = {
  items: BorrowerListItem[];
  nextCursor: string | null;
};

export type BorrowerDetail = {
  id: string;
  lenderId: string;
  phone: string;
  createdAt: string;
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
  } | null;
  override: {
    maxLoanKobo: number | null;
    maxTenorDays: number | null;
    updatedAt: string;
  } | null;
  notes: Array<{
    id: string;
    note: string;
    createdById: string;
    createdAt: string;
  }>;
};

export type BorrowerRisk = {
  borrowerId: string;
  profile: {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    lastEvaluatedAt: string | null;
  } | null;
  events: Array<{
    id: string;
    eventType: string;
    scoreDelta: number;
    totalScore: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    blocked: boolean;
    reason: string | null;
    createdAt: string;
  }>;
  devices: Array<{
    id: string;
    deviceId: string;
    ip: string | null;
    userAgent: string | null;
    lastSeenAt: string;
  }>;
};

export async function fetchBorrowers(params: {
  limit: number;
  cursor?: string;
  query?: string;
}): Promise<BorrowerListResponse> {
  const search = new URLSearchParams({ limit: String(params.limit) });
  if (params.cursor) {
    search.set('cursor', params.cursor);
  }
  if (params.query) {
    search.set('query', params.query);
  }
  return (await proxyRequest(`admin/borrowers?${search.toString()}`)) as BorrowerListResponse;
}

export async function fetchBorrower(id: string): Promise<BorrowerDetail> {
  return (await proxyRequest(`admin/borrowers/${id}`)) as BorrowerDetail;
}

export async function fetchBorrowerRisk(id: string): Promise<BorrowerRisk> {
  return (await proxyRequest(`admin/borrowers/${id}/risk`)) as BorrowerRisk;
}

export async function createBorrowerNote(id: string, note: string) {
  return proxyRequest(`admin/borrowers/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note })
  });
}

export async function upsertBorrowerOverride(
  id: string,
  input: { maxLoanKobo?: number; maxTenorDays?: number }
) {
  return proxyRequest(`admin/borrowers/${id}/override`, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}
