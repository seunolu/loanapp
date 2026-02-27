export class AppError extends Error {
  public readonly code: string;
  public readonly causeValue?: unknown;

  constructor(message: string, code = 'APP_ERROR', causeValue?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.causeValue = causeValue;
  }
}

export class ConfigError extends AppError {
  constructor(message: string, causeValue?: unknown) {
    super(message, 'CONFIG_ERROR', causeValue);
    this.name = 'ConfigError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, causeValue?: unknown) {
    super(message, 'AUTH_ERROR', causeValue);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  public readonly status?: number;

  constructor(message: string, status?: number, causeValue?: unknown) {
    super(message, 'NETWORK_ERROR', causeValue);
    this.name = 'NetworkError';
    this.status = status;
  }
}

