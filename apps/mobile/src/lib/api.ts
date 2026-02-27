import { getOrCreateDeviceId } from './device';
import Constants from 'expo-constants';
import { authRequest } from '../auth/auth-client';
import { clearTokens, getTokens, setTokens } from '../auth/token-storage';
import { getTenantSlug, setTenantSlug } from './storage';
import { getApiBaseUrl } from './apiBaseUrl';
import type { TenantSnapshot } from '../tenant/tenant-context';

const API_BASE = getApiBaseUrl();
const API_V1 = `${API_BASE}/api/v1`;
const DEFAULT_TENANT_SLUG =
  process.env.EXPO_PUBLIC_DEFAULT_TENANT_SLUG?.trim().toLowerCase() ??
  String((Constants.expoConfig?.extra as { defaultTenantSlug?: string } | undefined)?.defaultTenantSlug ?? '')
    .trim()
    .toLowerCase();

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

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return authRequest<T>(path, {
    method: options.method,
    body: options.body,
    headers: options.headers,
    requiresAuth: options.requiresAuth ?? false,
    retryOnUnauthorized: options.retryOnUnauthorized ?? true
  });
}

export async function loadTenantConfig(slug: string): Promise<TenantPublicConfig> {
  const normalizedSlug = slug.trim().toLowerCase();
  const response = await apiRequest<TenantPublicConfig>(`/public/config/by-slug?slug=${encodeURIComponent(normalizedSlug)}`);
  await setTenantSlug(normalizedSlug);
  return response;
}

export async function getSelectedTenantConfig(): Promise<TenantPublicConfig> {
  const storedSlug = (await getTenantSlug())?.trim().toLowerCase() ?? '';
  const resolvedSlug = storedSlug || DEFAULT_TENANT_SLUG;
  if (!resolvedSlug) {
    throw new ApiError('Tenant is not configured.', 400, 'TENANT_REQUIRED');
  }
  if (!storedSlug) {
    await setTenantSlug(resolvedSlug);
  }
  return loadTenantConfig(resolvedSlug);
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

  await setTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken
  });
  return response;
}

export async function logout(): Promise<void> {
  const tokens = await getTokens();
  if (tokens?.refreshToken) {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
      requiresAuth: false
    }).catch(() => undefined);
  }
  await clearTokens();
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

export type BorrowerRecentLoan = {
  id: string;
  amountKobo: number;
  status: string;
  createdAt: string;
};

export type BorrowerLoanApplicationDetail = {
  id: string;
  borrowerId: string;
  amountRequested: number;
  tenorDays: number;
  status: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BorrowerLoanOfferDetail = {
  offerId: string;
  applicationId: string;
  status: string;
  principalAmount: number;
  interestAmount: number;
  feeAmount: number;
  totalRepayable: number;
  offeredAt: string;
  expiresAt: string;
  schedule: {
    id: string;
    dueDate: string;
    amount: number;
  }[];
};

function getStatusFromUnknownError(error: unknown): number | null {
  if (error instanceof ApiError) {
    return error.status;
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return null;
}

function normalizeRecentLoans(payload: unknown): BorrowerRecentLoan[] {
  const rawItems = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && 'items' in payload && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : [];

  return rawItems
    .map((item): BorrowerRecentLoan | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const raw = item as {
        id?: unknown;
        status?: unknown;
        createdAt?: unknown;
        amountKobo?: unknown;
        amount?: unknown;
      };
      if (typeof raw.id !== 'string' || typeof raw.status !== 'string' || typeof raw.createdAt !== 'string') {
        return null;
      }

      const numericAmount =
        typeof raw.amountKobo === 'number'
          ? raw.amountKobo
          : typeof raw.amount === 'number'
            ? raw.amount
            : typeof raw.amount === 'string'
              ? Number(raw.amount)
              : 0;

      return {
        id: raw.id,
        status: raw.status,
        createdAt: raw.createdAt,
        amountKobo: Number.isFinite(numericAmount) ? Math.max(0, Math.round(numericAmount)) : 0
      };
    })
    .filter((item): item is BorrowerRecentLoan => Boolean(item));
}

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

export async function listRecentLoans(limit = 3): Promise<BorrowerRecentLoan[]> {
  const endpoints = [`/loans?limit=${limit}`, `/loans/applications?limit=${limit}`];

  for (const endpoint of endpoints) {
    try {
      const payload = await apiRequest<unknown>(endpoint, {
        method: 'GET',
        requiresAuth: true
      });
      return normalizeRecentLoans(payload).slice(0, limit);
    } catch (error: unknown) {
      if (getStatusFromUnknownError(error) === 404) {
        continue;
      }
      throw error;
    }
  }

  return [];
}

export async function getLoanApplicationDetail(id: string): Promise<BorrowerLoanApplicationDetail> {
  return apiRequest(`/loans/applications/${encodeURIComponent(id)}`, {
    method: 'GET',
    requiresAuth: true
  });
}

export async function getLoanOfferByApplication(id: string): Promise<BorrowerLoanOfferDetail> {
  return apiRequest(`/loans/offers/${encodeURIComponent(id)}`, {
    method: 'GET',
    requiresAuth: true
  });
}

export async function hasActiveSession(): Promise<boolean> {
  const tokens = await getTokens();
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
  messages: {
    id: string;
    visibility: 'BORROWER';
    message: string;
    createdByAdminUserId: string | null;
    createdByBorrowerId: string | null;
    createdAt: string;
  }[];
  history: {
    id: string;
    fromStatus: BorrowerCaseStatus | null;
    toStatus: BorrowerCaseStatus;
    reason: string | null;
    createdAt: string;
  }[];
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
  history: {
    id: string;
    fromStatus: BorrowerHardshipStatus;
    toStatus: BorrowerHardshipStatus;
    changedByAdminId: string | null;
    createdAt: string;
  }[];
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
