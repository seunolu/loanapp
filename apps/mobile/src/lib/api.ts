import { getOrCreateDeviceId } from './device';
import {
  clearSessionTokens,
  getSessionTokens,
  getTenantSlug,
  setSessionTokens,
  setTenantSlug,
  type SessionTokens
} from './storage';
import { getApiBaseUrl } from './apiBaseUrl';
import type { TenantSnapshot } from '../tenant/tenant-context';

const API_BASE = getApiBaseUrl();
const API_V1 = `${API_BASE}/api/v1`;

export function getApiBaseUrlSafe(): string {
  return getApiBaseUrl();
}

export async function fetchJson<T>(
  path: string,
  input: { token?: string | null; method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (input.token) {
    headers.set('Authorization', `Bearer ${input.token}`);
  }
  const response = await fetch(`${API_V1}${path}`, {
    method: input.method ?? 'GET',
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body)
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  };
};

export type TenantPublicConfig = {
  lenderId: string;
  lenderSlug: string;
  branding: {
    displayName: string;
    logoUrl: string | null;
    primaryColor: string;
  };
  policy: {
    minLoanAmountKobo: number;
    maxLoanAmountKobo: number;
    minTenorDays: number;
    maxTenorDays: number;
  };
  support: {
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
  };
  features: {
    maintenanceMode: boolean;
    enableOtpSms: boolean;
  };
};

export type BorrowerMe = {
  id: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  profile: null | {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string | null;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
  };
  kycStatus: string;
};

export type IdentityVerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
export type IdentityVerificationView = {
  id: string;
  provider: string;
  status: IdentityVerificationStatus;
  matchScore: number | null;
  riskFlags: unknown;
  createdAt: string;
  updatedAt: string;
};

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: unknown
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type ApiFetchTenant = Pick<TenantSnapshot, 'apiBaseUrl' | 'tenantSlug' | 'tenantId'>;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function toJsonBody(init: RequestInit, headers: Headers): BodyInit | null | undefined {
  const body = init.body;
  if (body === undefined || body === null) {
    return body;
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isString = typeof body === 'string';
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
  const isArrayBuffer = body instanceof ArrayBuffer;
  const isTypedArray = ArrayBuffer.isView(body);
  const isSearchParams = body instanceof URLSearchParams;

  if (isFormData || isString || isBlob || isArrayBuffer || isTypedArray || isSearchParams) {
    return body;
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return JSON.stringify(body);
}

function formatApiError(status: number, responseBody: unknown): string {
  if (typeof responseBody === 'string' && responseBody.trim()) {
    return `Request failed (${status}): ${responseBody}`;
  }

  if (responseBody && typeof responseBody === 'object') {
    const candidate = (responseBody as { message?: string; error?: { message?: string } }).error?.message ??
      (responseBody as { message?: string }).message;
    if (candidate) {
      return `Request failed (${status}): ${candidate}`;
    }

    return `Request failed (${status}): ${JSON.stringify(responseBody)}`;
  }

  return `Request failed (${status})`;
}

export async function apiFetch<T>(path: string, tenant: ApiFetchTenant, init: RequestInit = {}): Promise<T> {
  const baseUrl = trimTrailingSlashes(tenant.apiBaseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const headers = new Headers(init.headers ?? {});
  const body = toJsonBody(init, headers);

  if (body !== undefined && body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (tenant.tenantSlug) {
    headers.set('x-tenant-slug', tenant.tenantSlug);
  }

  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    ...init,
    headers,
    body
  });

  const rawBody = await response.text();
  let parsedBody: unknown = undefined;
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(formatApiError(response.status, parsedBody ?? rawBody), response.status, parsedBody ?? rawBody);
  }

  if (!rawBody) {
    return undefined as T;
  }

  return parsedBody as T;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  retryOnUnauthorized?: boolean;
};

let refreshPromise: Promise<SessionTokens | null> | null = null;

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

async function parseJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

async function refreshTokensSingleFlight(): Promise<SessionTokens | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tokens = await getSessionTokens();
      if (!tokens?.refreshToken) {
        return null;
      }

      const refreshed = await fetch(`${API_V1}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId(),
          'X-Device-Id': await getOrCreateDeviceId()
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      });

      if (!refreshed.ok) {
        await clearSessionTokens();
        return null;
      }

      const payload = await parseJson<{ accessToken?: string; refreshToken?: string }>(refreshed);
      if (!payload?.accessToken || !payload.refreshToken) {
        await clearSessionTokens();
        return null;
      }

      const nextTokens = { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
      await setSessionTokens(nextTokens);
      return nextTokens;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const requiresAuth = options.requiresAuth ?? false;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const deviceId = await getOrCreateDeviceId();

  const headers = new Headers(options.headers ?? {});
  headers.set('X-Request-Id', requestId());
  headers.set('X-Device-Id', deviceId);

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let accessToken = '';
  if (requiresAuth) {
    const tokens = await getSessionTokens();
    accessToken = tokens?.accessToken ?? '';
    if (!accessToken) {
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_V1}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401 && requiresAuth && retryOnUnauthorized) {
    const refreshed = await refreshTokensSingleFlight();
    if (!refreshed?.accessToken) {
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
  }

  if (!response.ok) {
    const payload = await parseJson<ApiErrorPayload>(response);
    throw new ApiError(payload?.error?.message ?? `Request failed (${response.status})`, response.status, payload?.error?.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loadTenantConfig(slug: string): Promise<TenantPublicConfig> {
  const response = await apiRequest<TenantPublicConfig>(`/public/config/by-slug?slug=${encodeURIComponent(slug)}`);
  await setTenantSlug(slug);
  return response;
}

export async function getSelectedTenantConfig(): Promise<TenantPublicConfig> {
  const slug = await getTenantSlug();
  if (!slug) {
    throw new ApiError('Select a tenant first.', 400, 'TENANT_REQUIRED');
  }
  return loadTenantConfig(slug);
}

export async function requestOtp(phone: string): Promise<{ otpRef: string; expiresInSec: number }> {
  const tenant = await getSelectedTenantConfig();
  return apiRequest<{ otpRef: string; expiresInSec: number }>('/auth/request-otp', {
    method: 'POST',
    headers: {
      'X-Lender-Id': tenant.lenderId
    },
    body: { phone },
    requiresAuth: false
  });
}

export async function verifyOtp(input: {
  phone: string;
  otpRef: string;
  otp: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const tenant = await getSelectedTenantConfig();
  const deviceId = await getOrCreateDeviceId();
  const response = await apiRequest<{
    accessToken: string;
    refreshToken: string;
  }>('/auth/verify-otp', {
    method: 'POST',
    headers: {
      'X-Lender-Id': tenant.lenderId
    },
    body: {
      phone: input.phone,
      otpRef: input.otpRef,
      otp: input.otp,
      deviceId,
      deviceName: 'LoanApp Mobile',
      platform: 'android'
    }
  });

  await setSessionTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken
  });
  return response;
}

export async function logout(): Promise<void> {
  const tokens = await getSessionTokens();
  if (tokens?.refreshToken) {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
      requiresAuth: false
    }).catch(() => undefined);
  }
  await clearSessionTokens();
}

export async function getMe(): Promise<BorrowerMe> {
  return apiRequest<BorrowerMe>('/me', { requiresAuth: true });
}

export async function recordIdentityConsent(type: 'KYC_CONSENT' | 'DATA_PROCESSING'): Promise<{
  id: string;
  type: string;
  acceptedAt: string;
}> {
  return apiRequest('/identity/consent', {
    method: 'POST',
    body: { type },
    requiresAuth: true
  });
}

export async function verifyIdentityBvn(bvn: string): Promise<IdentityVerificationView> {
  return apiRequest('/identity/verify-bvn', {
    method: 'POST',
    body: { bvn },
    requiresAuth: true
  });
}

export async function getIdentityStatus(): Promise<IdentityVerificationView | null> {
  return apiRequest('/identity/status', {
    method: 'GET',
    requiresAuth: true
  });
}

export type BorrowerMandateStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

export type BorrowerMandate = {
  id: string;
  loanId: string | null;
  provider: string;
  status: BorrowerMandateStatus;
  maxAmount: string | null;
  frequency: string | null;
  nextDebitAt: string | null;
  lastDebit: {
    id: string;
    status: string;
    amount: string;
    attemptedAt: string | null;
    succeededAt: string | null;
    failureReason: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export async function initiateRepayment(input: {
  loanId: string;
  amount: number;
}): Promise<{ paymentIntentId: string; reference: string | null; authorizationUrl: string | null }> {
  return apiRequest('/payments/repayments/initiate', {
    method: 'POST',
    body: input,
    requiresAuth: true
  });
}

export async function setupMandate(input: {
  loanId: string;
  maxAmount?: number;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}): Promise<{ mandateId: string | null; paymentIntentId: string; reference: string | null; authorizationUrl: string | null }> {
  return apiRequest('/mandates/setup', {
    method: 'POST',
    body: input,
    requiresAuth: true
  });
}

export async function listMyMandates(): Promise<BorrowerMandate[]> {
  return apiRequest('/mandates/me', {
    method: 'GET',
    requiresAuth: true
  });
}

export async function hasActiveSession(): Promise<boolean> {
  const tokens = await getSessionTokens();
  return Boolean(tokens?.accessToken && tokens.refreshToken);
}

export type BorrowerCaseType = 'COMPLAINT' | 'DISPUTE' | 'REQUEST';
export type BorrowerCaseStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'AWAITING_BORROWER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CLOSED';
export type BorrowerCasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type BorrowerCaseListItem = {
  id: string;
  type: BorrowerCaseType;
  status: BorrowerCaseStatus;
  priority: BorrowerCasePriority;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type BorrowerCaseDetail = BorrowerCaseListItem & {
  loanApplicationId: string | null;
  repaymentId: string | null;
  disbursementId: string | null;
  messages: Array<{
    id: string;
    visibility: 'BORROWER';
    message: string;
    createdByAdminUserId: string | null;
    createdByBorrowerId: string | null;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    fromStatus: BorrowerCaseStatus | null;
    toStatus: BorrowerCaseStatus;
    reason: string | null;
    createdAt: string;
  }>;
};

export async function listBorrowerCases(input?: {
  status?: BorrowerCaseStatus;
  page?: number;
  limit?: number;
}): Promise<{
  items: BorrowerCaseListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (input?.status) query.set('status', input.status);
  if (input?.page) query.set('page', String(input.page));
  if (input?.limit) query.set('limit', String(input.limit));
  const suffix = query.toString();
  return apiRequest(`/cases${suffix ? `?${suffix}` : ''}`, { requiresAuth: true });
}

export async function getBorrowerCase(id: string): Promise<BorrowerCaseDetail> {
  return apiRequest(`/cases/${encodeURIComponent(id)}`, { requiresAuth: true });
}

export async function createBorrowerCase(input: {
  type: BorrowerCaseType;
  subject: string;
  description: string;
  loanApplicationId?: string;
  repaymentId?: string;
  disbursementId?: string;
}): Promise<BorrowerCaseDetail> {
  return apiRequest('/cases', {
    method: 'POST',
    body: input,
    requiresAuth: true
  });
}

export async function addBorrowerCaseMessage(
  id: string,
  input: { message: string }
): Promise<{
  id: string;
  message: string;
  createdAt: string;
}> {
  return apiRequest(`/cases/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: input,
    requiresAuth: true
  });
}

export type BorrowerHardshipStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type BorrowerHardshipType = 'PAYMENT_PAUSE' | 'TENOR_EXTENSION' | 'RATE_REDUCTION';

export type BorrowerHardshipRequest = {
  id: string;
  loanApplicationId: string;
  type: BorrowerHardshipType;
  reason: string;
  proposedTenorMonths: number | null;
  proposedRate: string | null;
  pauseDays: number | null;
  status: BorrowerHardshipStatus;
  decisionNotes: string | null;
  approvedByAdminId: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type BorrowerHardshipDetail = BorrowerHardshipRequest & {
  history: Array<{
    id: string;
    fromStatus: BorrowerHardshipStatus;
    toStatus: BorrowerHardshipStatus;
    changedByAdminId: string | null;
    createdAt: string;
  }>;
};

export async function createHardshipRequest(input: {
  loanApplicationId: string;
  type: BorrowerHardshipType;
  reason: string;
  proposedTenorMonths?: number;
  proposedRate?: number;
  pauseDays?: number;
}): Promise<BorrowerHardshipRequest> {
  return apiRequest('/hardship', {
    method: 'POST',
    body: input,
    requiresAuth: true
  });
}

export async function listHardshipRequests(input?: {
  status?: BorrowerHardshipStatus;
  page?: number;
  limit?: number;
}): Promise<{
  items: BorrowerHardshipRequest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (input?.status) query.set('status', input.status);
  if (input?.page) query.set('page', String(input.page));
  if (input?.limit) query.set('limit', String(input.limit));
  const suffix = query.toString();
  return apiRequest(`/hardship${suffix ? `?${suffix}` : ''}`, { requiresAuth: true });
}

export async function getHardshipRequest(id: string): Promise<BorrowerHardshipDetail> {
  return apiRequest(`/hardship/${encodeURIComponent(id)}`, { requiresAuth: true });
}
