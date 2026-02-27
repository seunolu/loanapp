import { AuthError, NetworkError } from '../errors/AppError';
import { ApiRequestError } from './api';

function getStatus(error: unknown): number | null {
  if (error instanceof ApiRequestError) {
    return error.status;
  }
  if (error instanceof NetworkError && typeof error.status === 'number') {
    return error.status;
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const candidate = (error as { status?: unknown }).status;
    if (typeof candidate === 'number') {
      return candidate;
    }
  }
  return null;
}

export function isUnauthorized(error: unknown): boolean {
  const status = getStatus(error);
  return error instanceof AuthError || status === 401 || status === 403;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError && typeof error.status !== 'number') {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network request failed') || message.includes('network error');
  }
  return false;
}

export function getUserFacingErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Network error. Check your connection.';
  }

  const status = getStatus(error);
  if (status === 429) {
    return 'Too many requests. Try again shortly.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Service temporarily unavailable. Try again.';
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

