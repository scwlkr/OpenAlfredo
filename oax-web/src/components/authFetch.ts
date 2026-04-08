// Authenticated fetch wrapper — injects the API key as a Bearer token.
// Shared across all client components.
export function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const key = (window as any).__OAX_API_KEY || '';
  const headers = new Headers(opts.headers);
  if (key) headers.set('Authorization', `Bearer ${key}`);
  return fetch(url, { ...opts, headers });
}
