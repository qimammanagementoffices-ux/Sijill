"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken, setToken } from "@/lib/auth";
import type { Dictionary } from "@/i18n/getDictionary";

type AuthResponse = {
  token: string;
  employee: { id: string; employeeNumber: string; name: string; phone: string; permissions: string[] };
};

export default function LoginForm({ dict }: { dict: Dictionary["login"] }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already holding a valid-looking session? Skip straight past the form.
  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
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
    <form onSubmit={handleSubmit}>
      <label>
        {dict.phoneLabel}
        <input
          type="tel"
          name="phone"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
      <label>
        {dict.pinLabel}
        <input
          type="password"
          name="pin"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {dict.submit}
      </button>
    </form>
  );
}
