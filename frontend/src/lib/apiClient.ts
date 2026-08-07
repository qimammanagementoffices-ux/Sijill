import { clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);

    // Only clear/redirect for the client-held session — a public endpoint's
    // 401 (e.g. a bad login attempt) doesn't mean "your session expired".
    if (res.status === 401 && token && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
    }

    throw new ApiError(
      res.status,
      body?.error?.message ?? `Request failed: ${res.status}`,
      body?.error?.code
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// For binary responses (e.g. QR code PNGs) — apiFetch always parses JSON,
// which would fail on image bytes.
export async function apiFetchBlob(path: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.status}`);
  }
  return res.blob();
}
