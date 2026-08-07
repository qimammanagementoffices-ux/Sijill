// Token storage: localStorage + Authorization header (not an httpOnly
// cookie) — decided for Phase 2a since the frontend and backend live on
// separate onrender.com subdomains and this avoids cross-site cookie/CORS
// complexity for an MVP with no third-party script risk yet.

const TOKEN_KEY = "sijill.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}
