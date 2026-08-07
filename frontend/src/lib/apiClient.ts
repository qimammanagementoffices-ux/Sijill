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

  return res.json() as Promise<T>;
}
