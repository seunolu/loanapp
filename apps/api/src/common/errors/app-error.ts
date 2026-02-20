export type AppErrorOptions = {
  code: string;
  safe?: boolean;
  context?: Record<string, unknown>;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: string;
  readonly safe: boolean;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.code = options.code;
    this.safe = options.safe ?? true;
    this.context = options.context;
    if (options.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class DomainError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'DOMAIN_ERROR', safe: true, context });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'VALIDATION_ERROR', safe: true, context });
  }
}

export class InfrastructureError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'INFRASTRUCTURE_ERROR', safe: false, context });
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'AUTHORIZATION_ERROR', safe: true, context });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { code: 'CONFLICT_ERROR', safe: true, context });
  }
}
