import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().trim().min(1).default('api/v1'),
  CORS_ALLOWED_ORIGINS: z.string().trim().default('http://localhost:3000'),
  CORS_ALLOW_CREDENTIALS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  REQUEST_BODY_LIMIT: z.string().trim().min(2).default('1mb'),
  APP_VERSION: z.string().trim().min(1).default('dev'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  OTP_EXPIRES_IN_SEC: z.coerce.number().int().min(30).max(1800).default(900),
  OTP_RATE_LIMIT_PHONE_MAX: z.coerce.number().int().min(1).max(20).default(3),
  OTP_RATE_LIMIT_PHONE_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  OTP_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(200).default(20),
  OTP_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  BORROWER_LOGIN_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(200).default(20),
  BORROWER_LOGIN_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  GLOBAL_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(10).max(10000).default(300),
  GLOBAL_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(1).max(3600).default(60),
  OTP_HASH_SECRET: z.string().min(16).default('change-this-otp-secret'),
  OTP_DEV_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  OTP_DEV_FIXED_CODE: z.string().regex(/^\d{6}$/).optional(),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  JWT_ACCESS_SECRET: z.string().min(16).default('change-this-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(16).default('change-this-refresh-secret'),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().min(60).max(86400).default(900),
  JWT_REFRESH_TTL_SEC: z.coerce.number().int().min(3600).max(7776000).default(2592000),
  REFRESH_TOKEN_HASH_SECRET: z.string().min(16).default('change-this-refresh-token-hash-secret'),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).optional(),
  ADMIN_BOOTSTRAP_ROLE: z
    .enum(['PLATFORM_SUPER_ADMIN', 'OWNER', 'SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER'])
    .default('SUPER_ADMIN'),
  ADMIN_JWT_ACCESS_SECRET: z.string().min(16).default('change-this-admin-access-secret'),
  ADMIN_JWT_REFRESH_SECRET: z.string().min(16).default('change-this-admin-refresh-secret'),
  ADMIN_JWT_ACCESS_TTL_SEC: z.coerce.number().int().min(60).max(86400).default(900),
  ADMIN_JWT_REFRESH_TTL_SEC: z.coerce.number().int().min(3600).max(7776000).default(2592000),
  ADMIN_REFRESH_TOKEN_HASH_SECRET: z.string().min(16).default('change-this-admin-refresh-token-hash-secret'),
  ADMIN_INVITE_TOKEN_HASH_SECRET: z.string().min(16).default('change-this-admin-invite-token-hash-secret'),
  ADMIN_LOGIN_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(500).default(30),
  ADMIN_LOGIN_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  ADMIN_LOGIN_RATE_LIMIT_EMAIL_MAX: z.coerce.number().int().min(1).max(200).default(10),
  ADMIN_LOGIN_RATE_LIMIT_EMAIL_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  ADMIN_INVITE_SETUP_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(500).default(20),
  ADMIN_INVITE_SETUP_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  REFRESH_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(1000).default(120),
  REFRESH_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  PENALTY_DAILY_RATE_BPS: z.coerce.number().int().min(1).max(10000).default(50),
  PENALTY_DAILY_CAP_KOBO: z.coerce.number().int().min(1).max(100000000).default(100000),
  NOTIFICATIONS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMS_PROVIDER: z.enum(['DEV_SINK']).default('DEV_SINK'),
  EMAIL_PROVIDER: z.enum(['DEV_SINK']).default('DEV_SINK'),
  APP_PUBLIC_NAME: z.string().trim().min(1).default('LoanApp'),
  APP_PUBLIC_SUPPORT_PHONE: z.string().trim().min(1).default('+2340000000000'),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(8).default('change-this-paystack-webhook-secret'),
  PAYSTACK_DISABLE_SIGNATURE_VERIFY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SENTRY_DSN: z.string().trim().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  SENTRY_ENVIRONMENT: z.string().trim().optional()
});

export type Env = z.infer<typeof envSchema>;
