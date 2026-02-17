import { apiFetch } from './api';
import type { TenantSnapshot } from '../tenant/tenant-context';

export type ResolvedTenant = {
  tenantId: string;
  id: string;
  slug: string;
  name: string;
  lenderTitle?: string;
  apiBaseUrl?: string;
  theme?: Record<string, unknown>;
};

export type CreateLoanApplicationInput = {
  fullName: string;
  phone: string;
  email?: string;
  dob?: string;
  address?: string;
  amount: number;
  tenorMonths: number;
  purpose?: string;
  employmentStatus?: string;
  incomeBand?: string;
};

export type LoanApplicationSummary = {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export type LoanApplicationDetails = LoanApplicationSummary & {
  tenantId: string;
  fullName: string;
  phone: string;
  email?: string;
  dob?: string;
  address?: string;
  amount: number;
  tenorMonths: number;
  purpose?: string;
  employmentStatus?: string;
  incomeBand?: string;
  updatedAt: string;
};

function tenantFetchContext(tenant: Pick<TenantSnapshot, 'apiBaseUrl' | 'tenantSlug' | 'tenantId'>) {
  return {
    apiBaseUrl: tenant.apiBaseUrl,
    tenantSlug: tenant.tenantSlug,
    tenantId: tenant.tenantId
  };
}

export function resolveTenant(input: {
  apiBaseUrl: string;
  slug: string;
  lenderTitle?: string;
}): Promise<ResolvedTenant> {
  const params = new URLSearchParams({
    slug: input.slug
  });
  if (input.lenderTitle?.trim()) {
    params.set('lenderTitle', input.lenderTitle.trim());
  }

  return apiFetch<ResolvedTenant>(`/api/v1/tenants/resolve?${params.toString()}`, {
    apiBaseUrl: input.apiBaseUrl,
    tenantSlug: input.slug
  });
}

export function createLoanApplication(
  tenant: Pick<TenantSnapshot, 'apiBaseUrl' | 'tenantSlug' | 'tenantId'>,
  input: CreateLoanApplicationInput
): Promise<LoanApplicationSummary> {
  return apiFetch<LoanApplicationSummary>('/api/v1/loan-applications', tenantFetchContext(tenant), {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function getLoanApplication(
  tenant: Pick<TenantSnapshot, 'apiBaseUrl' | 'tenantSlug' | 'tenantId'>,
  id: string
): Promise<LoanApplicationDetails> {
  return apiFetch<LoanApplicationDetails>(`/api/v1/loan-applications/${encodeURIComponent(id)}`, tenantFetchContext(tenant), {
    method: 'GET'
  });
}
