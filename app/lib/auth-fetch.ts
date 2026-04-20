export type AuthFetchOptions = {
  token: string;
  body?: unknown;
  headers?: HeadersInit;
  method?: string;
  timeoutMs?: number;
};

export async function authFetchJson<T>(url: string, options: AuthFetchOptions): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${options.token}`,
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({} as Record<string, unknown>));

  if (!response.ok) {
    const message = typeof data.error === 'string'
      ? data.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
