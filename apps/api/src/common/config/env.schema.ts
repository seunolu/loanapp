import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().trim().min(1).default('api/v1'),
  CORS_ORIGINS: z
    .string()
    .trim()
    .default('http://localhost:3000,http://localhost:3001,http://10.0.2.2:8081,http://192.168.0.0/16,exp://*'),
  CORS_ALLOWED_ORIGINS: z.string().trim().default('http://localhost:3000'),
  CORS_ALLOW_CREDENTIALS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  REQUEST_BODY_LIMIT: z.string().trim().min(2).default('1mb'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  APP_VERSION: z.string().trim().min(1).default('dev'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  METRICS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value == null ? undefined : value === 'true')),
  METRICS_TOKEN: z.string().trim().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  OTP_EXPIRES_IN_SEC: z.coerce.number().int().min(30).max(1800).default(900),
  OTP_RATE_LIMIT_PHONE_MAX: z.coerce.number().int().min(1).max(20).default(5),
  OTP_RATE_LIMIT_PHONE_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  OTP_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(200).default(5),
  OTP_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  BORROWER_LOGIN_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(200).default(20),
  BORROWER_LOGIN_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  GLOBAL_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(10).max(10000).default(200),
  GLOBAL_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(1).max(3600).default(60),
  RATE_TTL: z.coerce.number().int().min(1).max(3600).default(60),
  RATE_LIMIT: z.coerce.number().int().min(1).max(10000).default(120),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).max(1000).default(10),
  RATE_LIMIT_AUTH_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(300),
  RATE_LIMIT_OTP_MAX: z.coerce.number().int().min(1).max(1000).default(5),
  RATE_LIMIT_OTP_WINDOW_SECONDS: z.coerce.number().int().min(1).max(7200).default(600),
  RATE_LIMIT_LOAN_APPLICATION_SUBMIT_MAX: z.coerce.number().int().min(1).max(1000).default(20),
  RATE_LIMIT_LOAN_APPLICATION_SUBMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(7200).default(600),
  RATE_LIMIT_GENERIC_MAX: z.coerce.number().int().min(1).max(10000).default(200),
  RATE_LIMIT_GENERIC_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
  HEALTH_READY_REDIS_REQUIRED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
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
  TENANT_ADMIN_JWT_SECRET: z.string().min(16).default('change-this-tenant-admin-jwt-secret'),
  TENANT_ADMIN_JWT_TTL_SEC: z.coerce.number().int().min(60).max(86400).default(3600),
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
  ENABLE_OUTBOX_WORKER: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  OUTBOX_WORKER_INTERVAL_MS: z.coerce.number().int().min(1000).max(600000).default(10000),
  OUTBOX_STREAM: z.string().trim().min(1).default('loanapp:domain-events'),
  OUTBOX_POLL_MS: z.coerce.number().int().min(100).max(600000).default(1000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(1000).default(25),
  EVENT_STREAM_CONSUMERS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  READ_MODEL_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  SMS_PROVIDER: z.enum(['DEV_SINK']).default('DEV_SINK'),
  EMAIL_PROVIDER: z.enum(['DEV_SINK']).default('DEV_SINK'),
  APP_PUBLIC_NAME: z.string().trim().min(1).default('LoanApp'),
  APP_PUBLIC_SUPPORT_PHONE: z.string().trim().min(1).default('+2340000000000'),
  PAYMENTS_PROVIDER: z.enum(['paystack']).default('paystack'),
  PAYSTACK_BASE_URL: z.string().url().default('https://api.paystack.co'),
  PAYSTACK_SECRET_KEY: z.string().min(8).default('change-this-paystack-secret-key'),
  PAYSTACK_PUBLIC_KEY: z.string().min(8).optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(8).default('change-this-paystack-webhook-secret'),
  PAYSTACK_DISABLE_SIGNATURE_VERIFY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  BVN_PROVIDER: z.enum(['NIBSS']).default('NIBSS'),
  BVN_DEV_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  BVN_DEV_FIXED_PASS_BVN: z.string().regex(/^\d{11}$/).optional(),
  BVN_PROVIDER_BASE_URL: z.string().url().optional(),
  BVN_PROVIDER_API_KEY: z.string().min(8).optional(),
  BVN_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  NIN_PROVIDER: z.enum(['STUB']).default('STUB'),
  IDENTITY_VERIFY_RATE_LIMIT_IP_MAX: z.coerce.number().int().min(1).max(200).default(10),
  IDENTITY_VERIFY_RATE_LIMIT_IP_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(600),
  PAYMENTS_RECONCILIATION_JOB_ENABLED: z.enum(['true', 'false']).default('true'),
  PAYMENTS_RECONCILIATION_JOB_INTERVAL_MS: z.coerce.number().int().min(60000).max(3600000).default(300000),
  PAYMENTS_RECONCILIATION_STALE_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  PAYMENTS_RECONCILIATION_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
  MANDATE_DEBIT_JOB_ENABLED: z.enum(['true', 'false']).default('true'),
  MANDATE_DEBIT_JOB_INTERVAL_MS: z.coerce.number().int().min(60000).max(3600000).default(300000),
  MANDATE_DEBIT_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(3),
  MANDATE_DEBIT_BASE_BACKOFF_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
  QUEUE_METRICS_INTERVAL_MS: z.coerce.number().int().min(1000).max(3600000).default(10000),
  JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(5),
  JOB_BACKOFF_MS: z.coerce.number().int().min(100).max(3600000).default(30000),
  JOB_DLQ_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SENTRY_DSN: z.string().trim().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  SENTRY_ENVIRONMENT: z.string().trim().optional(),
  DELINQUENCY_JOB_ENABLED: z.enum(['true', 'false']).default('true'),
  DELINQUENCY_JOB_CRON: z.string().trim().default('*/5 * * * *'),
  INTEGRITY_SCAN_JOB_ENABLED: z.enum(['true', 'false']).default('true'),
  INTEGRITY_SCAN_JOB_INTERVAL_MS: z.coerce.number().int().min(60000).max(3600000).default(600000),
  COLLECTIONS_PENALTY_DAILY_RATE_BPS: z.coerce.number().int().min(0).max(10000).default(15),
  RECONCILIATION_JOB_ENABLED: z.enum(['true', 'false']).default('true'),
  RECONCILIATION_JOB_INTERVAL_MS: z.coerce.number().int().min(60000).max(86400000).default(86400000),
  LEDGER_RECONCILE_JOB_ENABLED: z.enum(['true', 'false']).default('true'),
  // --- Added for CI: typed env keys ---,
  ADMIN_CONFIRMATION_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  WEBHOOK_ALLOWED_SKEW_SECONDS: z.coerce.number().int().nonnegative().default(300),
  WEBHOOK_REPLAY_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
})


export type Env = z.infer<typeof envSchema>;

