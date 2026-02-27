import { getApiBaseUrlCandidates } from './apiBaseUrl';
import { NetworkError } from '../errors/AppError';
import { request } from './http/client';

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const normalizedPath = normalizePath(path);
  const candidates = getApiBaseUrlCandidates();
  let lastError: unknown;

  for (let index = 0; index < candidates.length; index += 1) {
    const baseUrl = candidates[index];
    const url = `${baseUrl}${normalizedPath}`;

    try {
      return await request<T>('GET', url, {
        headers: {
          Accept: 'application/json'
        }
      });
    } catch (error) {
      lastError = error;
      const hasFallback = index < candidates.length - 1;
      const isNetworkError = error instanceof NetworkError;

      if (hasFallback && isNetworkError) {
        continue;
      }

      throw error;
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Request failed'));
}
