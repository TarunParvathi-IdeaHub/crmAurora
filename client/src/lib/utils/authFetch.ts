/**
 * Authenticated fetch wrapper.
 * Sends the JWT as an Authorization Bearer header (read from localStorage)
 * so that API calls work cross-origin even when the httpOnly cookie is
 * blocked by the browser's SameSite / Secure policy.
 */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('erpUser');
      if (raw) {
        token = (JSON.parse(raw) as { token?: string }).token ?? null;
      }
    } catch {
      // ignore parse errors
    }
  }

  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
