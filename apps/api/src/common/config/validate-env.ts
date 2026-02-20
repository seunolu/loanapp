import { envSchema, type Env } from './env.schema';

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    const requiredProdValues: Array<[keyof Env, string | undefined]> = [
      ['DATABASE_URL', env.DATABASE_URL],
      ['REDIS_URL', env.REDIS_URL],
      ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
      ['ADMIN_JWT_ACCESS_SECRET', env.ADMIN_JWT_ACCESS_SECRET],
      ['ADMIN_JWT_REFRESH_SECRET', env.ADMIN_JWT_REFRESH_SECRET],
      ['TENANT_ADMIN_JWT_SECRET', env.TENANT_ADMIN_JWT_SECRET],
      ['PAYSTACK_SECRET_KEY', env.PAYSTACK_SECRET_KEY],
      ['PAYMENTS_PROVIDER', env.PAYMENTS_PROVIDER],
      ['PAYSTACK_BASE_URL', env.PAYSTACK_BASE_URL],
      ['PAYSTACK_WEBHOOK_SECRET', env.PAYSTACK_WEBHOOK_SECRET],
      ['CORS_ORIGINS', env.CORS_ORIGINS],
      ['CORS_ALLOWED_ORIGINS', env.CORS_ALLOWED_ORIGINS]
    ];

    const missing = requiredProdValues
      .filter(([, value]) => !value || !value.trim())
      .map(([key]) => String(key));
    if (missing.length > 0) {
      throw new Error(`Invalid environment configuration: missing required production vars: ${missing.join(', ')}`);
    }

    const insecureDefaults: Array<[keyof Env, string]> = [
      ['OTP_HASH_SECRET', 'change-this-otp-secret'],
      ['JWT_ACCESS_SECRET', 'change-this-access-secret'],
      ['JWT_REFRESH_SECRET', 'change-this-refresh-secret'],
      ['REFRESH_TOKEN_HASH_SECRET', 'change-this-refresh-token-hash-secret'],
      ['ADMIN_JWT_ACCESS_SECRET', 'change-this-admin-access-secret'],
      ['ADMIN_JWT_REFRESH_SECRET', 'change-this-admin-refresh-secret'],
      ['TENANT_ADMIN_JWT_SECRET', 'change-this-tenant-admin-jwt-secret'],
      ['ADMIN_INVITE_TOKEN_HASH_SECRET', 'change-this-admin-invite-token-hash-secret'],
      ['PAYSTACK_SECRET_KEY', 'change-this-paystack-secret-key'],
      ['PAYSTACK_WEBHOOK_SECRET', 'change-this-paystack-webhook-secret']
    ];

    const weak = insecureDefaults
      .filter(([key, value]) => env[key] === value)
      .map(([key]) => String(key));
    if (weak.length > 0) {
      throw new Error(`Invalid environment configuration: insecure default secrets in production: ${weak.join(', ')}`);
    }

    if (env.CORS_ALLOWED_ORIGINS.includes('*')) {
      throw new Error('Invalid environment configuration: wildcard CORS is not allowed in production.');
    }

    if (env.OTP_DEV_MODE) {
      throw new Error('Invalid environment configuration: OTP_DEV_MODE must be false in production.');
    }
  }

  return env;
}
