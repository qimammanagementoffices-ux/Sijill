"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken, setToken } from "@/lib/auth";
import type { Dictionary } from "@/i18n/getDictionary";
import type { LocaleInfo } from "@/i18n/locales";
import LocaleSwitcher from "@/components/LocaleSwitcher";

type AuthResponse = {
  token: string;
  employee: { id: string; employeeNumber: string; name: string; phone: string; permissions: string[] };
};

// Same key BackupAdmin.tsx writes to before forcing a post-restore logout.
const RESTORE_FLASH_KEY = "sijill.restoredFlash";

export default function LoginForm({
  dict,
  locales,
  currentLocale,
}: {
  dict: Dictionary["login"];
  locales: LocaleInfo[];
  currentLocale: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Already holding a valid-looking session? Skip straight past the form.
  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    const message = window.sessionStorage.getItem(RESTORE_FLASH_KEY);
    if (message) {
      setFlash(message);
      window.sessionStorage.removeItem(RESTORE_FLASH_KEY);
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, pin }),
      });
      setToken(response.token);
      router.push("/dashboard");
    } catch (err) {
      // Server already returns the generic message; still fall back defensively.
      setError(err instanceof ApiError ? err.message : dict.genericError);
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="login-lang">
        <LocaleSwitcher locales={locales} current={currentLocale} />
      </div>
      <form onSubmit={handleSubmit}>
        {flash && <p role="status">{flash}</p>}
        <div className="field">
          <label>{dict.phoneLabel}</label>
          <input
            type="tel"
            name="phone"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>{dict.pinLabel}</label>
          <input
            type="password"
            name="pin"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginTop: 10 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={submitting}>
          {dict.submit}
        </button>
      </form>
    </>
  );
}
