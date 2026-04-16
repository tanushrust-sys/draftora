export type AuthFetchOptions = {
  token: string;
  body?: unknown;
  headers?: HeadersInit;
  method?: string;
};

export async function authFetchJson<T>(url: string, options: AuthFetchOptions): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({} as Record<string, unknown>));

  if (!response.ok) {
    const message = typeof data.error === 'string'
      ? data.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
