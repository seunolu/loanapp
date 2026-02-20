import { getApiBaseUrlCandidates } from './apiBaseUrl';

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
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`GET ${url} failed with ${response.status} ${response.statusText}: ${responseText}`);
      }

      if (!responseText) {
        return undefined as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch {
        throw new Error(`GET ${url} returned non-JSON response: ${responseText}`);
      }
    } catch (error) {
      lastError = error;
      const hasFallback = index < candidates.length - 1;
      const isNetworkError = error instanceof TypeError;

      if (hasFallback && isNetworkError) {
        continue;
      }

      throw error;
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Request failed'));
}
