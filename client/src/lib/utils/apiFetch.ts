/**
 * Drop-in replacement for `fetch` that automatically attaches the JWT token
 * as an `Authorization: Bearer` header when available in localStorage.
 *
 * This is needed for cross-origin deployments (e.g. Vercel + Render) where
 * the browser blocks same-site cookies on cross-origin requests.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("erpUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getStoredToken();

  const headers = new Headers(init.headers ?? {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
}
