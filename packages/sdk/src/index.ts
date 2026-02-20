import type { paths } from './generated/openapi.types';

type FetchLike = typeof fetch;

export type ClientOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
  defaultHeaders?: Record<string, string>;
};

type HeadersInput = Record<string, string | undefined>;

export type AdminLoanApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED';

export class LoanAppSdkClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  requestOtp(
    body: paths['/auth/request-otp']['post']['requestBody']['content']['application/json'],
    headers: HeadersInput = {}
  ) {
    return this.request<
      paths['/auth/request-otp']['post']['responses'][200]['content']['application/json']
    >('/auth/request-otp', 'POST', body, headers);
  }

  verifyOtp(
    body: paths['/auth/verify-otp']['post']['requestBody']['content']['application/json'],
    headers: HeadersInput = {}
  ) {
    return this.request<
      paths['/auth/verify-otp']['post']['responses'][200]['content']['application/json']
    >('/auth/verify-otp', 'POST', body, headers);
  }

  refreshBorrower(
    body: paths['/auth/refresh']['post']['requestBody']['content']['application/json'],
    headers: HeadersInput = {}
  ) {
    return this.request<
      paths['/auth/refresh']['post']['responses'][200]['content']['application/json']
    >('/auth/refresh', 'POST', body, headers);
  }

  logoutBorrower(
    body: paths['/auth/logout']['post']['requestBody']['content']['application/json'],
    headers: HeadersInput = {}
  ) {
    return this.request<void>('/auth/logout', 'POST', body, headers);
  }

  getMe(headers: HeadersInput = {}) {
    return this.request<paths['/me']['get']['responses'][200]['content']['application/json']>('/me', 'GET', undefined, headers);
  }

  createLoanApplication(
    body: paths['/loans/applications']['post']['requestBody']['content']['application/json'],
    headers: HeadersInput = {}
  ) {
    return this.request<
      paths['/loans/applications']['post']['responses'][200]['content']['application/json']
    >('/loans/applications', 'POST', body, headers);
  }

  getSummaryReport(headers: HeadersInput = {}, asOf?: string) {
    const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
    return this.request<
      paths['/admin/reports/summary']['get']['responses'][200]['content']['application/json']
    >(`/admin/reports/summary${query}`, 'GET', undefined, headers);
  }

  getPortfolioReport(from: string, to: string, headers: HeadersInput = {}) {
    const query = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return this.request<
      paths['/admin/reports/portfolio']['get']['responses'][200]['content']['application/json']
    >(`/admin/reports/portfolio${query}`, 'GET', undefined, headers);
  }

  getCollectionsReport(from: string, to: string, daily = false, headers: HeadersInput = {}) {
    const query = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&daily=${daily ? 'true' : 'false'}`;
    return this.request<
      paths['/admin/reports/collections']['get']['responses'][200]['content']['application/json']
    >(`/admin/reports/collections${query}`, 'GET', undefined, headers);
  }

  getParReport(headers: HeadersInput = {}, asOf?: string) {
    const query = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
    return this.request<
      paths['/admin/reports/par']['get']['responses'][200]['content']['application/json']
    >(`/admin/reports/par${query}`, 'GET', undefined, headers);
  }

  getPublicConfig(headers: HeadersInput = {}) {
    return this.request<
      paths['/public/config']['get']['responses'][200]['content']['application/json']
    >('/public/config', 'GET', undefined, headers);
  }

  getBorrowerRisk(id: string, headers: HeadersInput = {}) {
    return this.request<
      paths['/admin/borrowers/{id}/risk']['get']['responses'][200]['content']['application/json']
    >(`/admin/borrowers/${encodeURIComponent(id)}/risk`, 'GET', undefined, headers);
  }

  adminLogin(
    body: { email: string; password: string; tenantSlug: string },
    headers: HeadersInput = {}
  ) {
    return this.request<{ accessToken: string; refreshToken?: string; admin?: unknown }>(
      '/admin/auth/login',
      'POST',
      body,
      headers
    );
  }

  listAdminLoanApplications(
    params: { status?: AdminLoanApplicationStatus } = {},
    headers: HeadersInput = {}
  ) {
    const query = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
    return this.request<{ items: unknown[] } | unknown[]>(`/admin/loan-applications${query}`, 'GET', undefined, headers);
  }

  getAdminLoanApplication(id: string, headers: HeadersInput = {}) {
    return this.request<unknown>(`/admin/loan-applications/${encodeURIComponent(id)}`, 'GET', undefined, headers);
  }

  setAdminLoanApplicationStatus(
    id: string,
    body: { status: AdminLoanApplicationStatus; reason?: string },
    headers: HeadersInput = {}
  ) {
    return this.request<unknown>(`/admin/loan-applications/${encodeURIComponent(id)}/status`, 'PATCH', body, headers);
  }

  private async request<T>(path: string, method: string, body?: unknown, headers: HeadersInput = {}): Promise<T> {
    const finalHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...Object.fromEntries(Object.entries(headers).filter(([, value]) => typeof value === 'string')) as Record<string, string>
    };
    if (body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(
        `SDK request failed: ${method} ${path} -> ${response.status} ${response.statusText}; payload=${JSON.stringify(errorPayload)}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
