import { NetworkError } from '../errors/AppError';

type SecureFetchOptions = {
  timeoutMs?: number;
  retryIdempotentGet?: boolean;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === 'REQUEST_TIMEOUT';
}

function isNetworkFailure(error: unknown): boolean {
  if (isTimeoutError(error)) {
    return true;
  }
  return error instanceof TypeError;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('REQUEST_TIMEOUT')), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new Error('REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function secureFetch(url: string, init: RequestInit = {}, options: SecureFetchOptions = {}): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const method = (init.method ?? 'GET').toUpperCase();
  const canRetryGet = method === 'GET' && (options.retryIdempotentGet ?? true);

  let attempt = 0;
  const maxAttempts = canRetryGet ? 3 : 1;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fetchWithTimeout(url, init, timeoutMs);
    } catch (error: unknown) {
      if (!isNetworkFailure(error) || attempt >= maxAttempts) {
        if (isTimeoutError(error)) {
          throw new NetworkError('Request timed out. Please try again.', undefined, error);
        }
        throw new NetworkError('Network request failed.', undefined, error);
      }
      const backoffMs = Math.min(250 * 2 ** (attempt - 1), 1_500);
      await wait(backoffMs);
    }
  }

  throw new NetworkError('Network request failed.');
}

