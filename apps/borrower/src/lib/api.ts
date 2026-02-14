'use client';

const DEVICE_KEY = 'loanapp.borrower.deviceId';

type HeadersInput = Record<string, string | undefined>;

function getRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'borrower-web-ssr';
  }
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }
  const created = `web-${crypto.randomUUID()}`;
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

async function parseOrThrow(response: Response): Promise<unknown> {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
}

async function internalRequest<T>(path: string, init: RequestInit = {}, headersInput: HeadersInput = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('X-Request-Id', getRequestId());
  headers.set('X-Device-Id', getOrCreateDeviceId());

  for (const [key, value] of Object.entries(headersInput)) {
    if (value) {
      headers.set(key, value);
    }
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store'
  });

  return (await parseOrThrow(response)) as T;
}

function proxyPath(path: string): string {
  return `/api/proxy/${path.replace(/^\/+/, '')}`;
}

export type PublicConfig = {
  lenderId: string;
  lenderSlug: string;
  branding: { displayName: string; logoUrl: string | null; primaryColor: string };
  policy: { minLoanAmountKobo: number; maxLoanAmountKobo: number; minTenorDays: number; maxTenorDays: number };
  support: { phone: string | null; email: string | null; whatsapp: string | null };
  features: { maintenanceMode: boolean; enableOtpSms: boolean };
};

export function getTenantConfigBySlug(slug: string) {
  return internalRequest<PublicConfig>(proxyPath(`/public/config/by-slug?slug=${encodeURIComponent(slug)}`), {
    method: 'GET'
  });
}

export function requestOtp(slug: string, phone: string) {
  return internalRequest<{ otpRef: string; expiresInSec: number }>('/api/auth/otp-request', {
    method: 'POST',
    body: JSON.stringify({
      slug,
      phone,
      deviceId: getOrCreateDeviceId()
    })
  });
}

export function verifyOtp(slug: string, body: { otpRef: string; phone: string; otp: string }) {
  return internalRequest<{ ok: true }>('/api/auth/otp-verify', {
    method: 'POST',
    body: JSON.stringify({
      slug,
      phone: body.phone,
      otpRef: body.otpRef,
      otp: body.otp,
      deviceId: getOrCreateDeviceId(),
      deviceName: 'Borrower Web',
      platform: 'web'
    })
  });
}

export function refreshBorrowerSession() {
  return internalRequest<{ ok: true }>('/api/auth/refresh', { method: 'POST' });
}

export function logoutBorrowerSession() {
  return internalRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}

export function getMe() {
  return internalRequest<{
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
    activeLoan: null | { id?: string; loanId?: string; status?: string };
  }>(proxyPath('/me'));
}

export function updateProfile(body: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
}) {
  return internalRequest(proxyPath('/me/profile'), { method: 'PUT', body: JSON.stringify(body) });
}

export function createLoanApplication(body: { amountRequested: number; tenorDays: number }) {
  return internalRequest<{ applicationId: string; status: string }>(proxyPath('/loans/applications'), {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function getOfferByApplication(applicationId: string) {
  return internalRequest<{
    offerId: string;
    applicationId: string;
    status: string;
    principalAmount: number;
    interestAmount: number;
    feeAmount: number;
    totalRepayable: number;
    offeredAt: string;
    expiresAt: string;
    schedule: Array<{ id: string; dueDate: string; amount: number }>;
  }>(proxyPath(`/loans/offers/${encodeURIComponent(applicationId)}`));
}

export function acceptOffer(offerId: string) {
  return internalRequest<{ loanId: string; status: string }>(
    proxyPath(`/loans/offers/${encodeURIComponent(offerId)}/accept`),
    { method: 'POST' },
    { 'Idempotency-Key': `ACCEPT_OFFER:web:${offerId}` }
  );
}

export function getLoanSchedule(loanId: string) {
  return internalRequest<{ loanId: string; items: Array<{ id: string; dueDate: string; amount: number; status: string }> }>(
    proxyPath(`/loans/${encodeURIComponent(loanId)}/schedule`)
  );
}

export function initializeRepayment(loanId: string, amountKobo: number) {
  return internalRequest<{ paymentId: string; provider: string; authorizationUrl: string; reference: string }>(
    proxyPath('/payments/initialize'),
    {
      method: 'POST',
      body: JSON.stringify({ loanId, amountKobo })
    },
    { 'Idempotency-Key': `INIT_PAYMENT:web:${loanId}:${amountKobo}:${Date.now()}` }
  );
}
