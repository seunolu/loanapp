import { LoanAppSdkClient } from '@loanapp/sdk';
import { getApiV1BaseUrl } from '@/lib/api/config';
import { getRequestId } from '@/lib/api/request-id';

export function createAdminSdk(options?: { accessToken?: string; lenderId?: string }) {
  const defaultHeaders: Record<string, string> = {
    'X-Request-Id': getRequestId()
  };

  if (options?.accessToken) {
    defaultHeaders.Authorization = `Bearer ${options.accessToken}`;
  }

  if (options?.lenderId) {
    defaultHeaders['X-Lender-Id'] = options.lenderId;
  }

  return new LoanAppSdkClient({
    baseUrl: getApiV1BaseUrl(),
    defaultHeaders
  });
}
