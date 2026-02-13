export interface paths {
  '/auth/request-otp': {
    post: {
      requestBody: { content: { 'application/json': { phone: string } } };
      responses: { 200: { content: { 'application/json': { otpRef: string; expiresInSec: number } } } };
    };
  };
  '/auth/verify-otp': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            otpRef: string;
            phone: string;
            otp: string;
            deviceId?: string;
            deviceName?: string;
            platform?: string;
          };
        };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              accessToken: string;
              refreshToken: string;
              borrower: { id: string; lenderId: string; phone: string };
            };
          };
        };
      };
    };
  };
  '/auth/refresh': {
    post: {
      requestBody: { content: { 'application/json': { refreshToken: string } } };
      responses: {
        200: {
          content: {
            'application/json': {
              accessToken: string;
              refreshToken: string;
              borrower: { id: string; lenderId: string; phone: string };
            };
          };
        };
      };
    };
  };
  '/auth/logout': {
    post: {
      requestBody: { content: { 'application/json': { refreshToken: string } } };
      responses: { 200: { content: { 'application/json': { ok: true } } } };
    };
  };
  '/me': {
    get: {
      responses: { 200: { content: { 'application/json': unknown } } };
    };
  };
  '/loans/applications': {
    post: {
      requestBody: { content: { 'application/json': { amountRequested: number; tenorDays: number } } };
      responses: { 200: { content: { 'application/json': { applicationId: string; status: string } } } };
    };
  };
  '/admin/reports/summary': {
    get: { responses: { 200: { content: { 'application/json': unknown } } } };
  };
  '/admin/reports/portfolio': {
    get: { responses: { 200: { content: { 'application/json': unknown } } } };
  };
  '/admin/reports/collections': {
    get: { responses: { 200: { content: { 'application/json': unknown } } } };
  };
  '/admin/reports/par': {
    get: { responses: { 200: { content: { 'application/json': unknown } } } };
  };
  '/public/config': {
    get: { responses: { 200: { content: { 'application/json': unknown } } } };
  };
  '/admin/borrowers/{id}/risk': {
    get: { responses: { 200: { content: { 'application/json': unknown } } } };
  };
}
