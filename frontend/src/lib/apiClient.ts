import { clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const IMAGE_COMPRESSION_TARGET_MB = 1.8;
const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp"]);

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

// For multipart file uploads — apiFetch always sends Content-Type:
// application/json, which would break the browser's automatic boundary
// header for FormData.
async function prepareUpload(formData: FormData): Promise<FormData> {
  const prepared = new FormData();

  for (const [key, value] of formData.entries()) {
    if (!(value instanceof File)) {
      prepared.append(key, value);
      continue;
    }

    let file = value;
    if (file.size > MAX_UPLOAD_SIZE_BYTES && COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
      const { default: imageCompression } = await import("browser-image-compression");
      file = await imageCompression(file, {
        maxSizeMB: IMAGE_COMPRESSION_TARGET_MB,
        maxWidthOrHeight: 2560,
        initialQuality: 0.85,
        maxIteration: 12,
        useWebWorker: false,
      });
    }

    // Keep the server-side 2 MB contract authoritative. Some unusually
    // complex images cannot reach the target without becoming unusable.
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new ApiError(400, "File must be 2MB or smaller", "VALIDATION_ERROR");
    }

    prepared.append(key, file, file.name || value.name);
  }

  return prepared;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const prepared = await prepareUpload(formData);
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: prepared,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? `Request failed: ${res.status}`, body?.error?.code);
  }
  return res.json() as Promise<T>;
}
