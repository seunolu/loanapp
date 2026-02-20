import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException
} from '@nestjs/common';

export class DomainIntegrityError extends ConflictException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: 'INTEGRITY_VIOLATION',
      message,
      details: details ?? null
    });
  }
}

export class IdempotencyConflictError extends ConflictException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: 'IDEMPOTENCY_CONFLICT',
      message,
      details: details ?? null
    });
  }
}

export class StateMachineViolationError extends BadRequestException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: 'STATE_CONFLICT',
      message,
      details: details ?? null
    });
  }
}

export class RBACViolationError extends ForbiddenException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: 'FORBIDDEN',
      message,
      details: details ?? null
    });
  }
}

export class RiskPolicyViolationError extends UnprocessableEntityException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: 'RISK_POLICY_VIOLATION',
      message,
      details: details ?? null
    });
  }
}
