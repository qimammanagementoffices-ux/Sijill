"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { setToken } from "@/lib/auth";
import type { Dictionary } from "@/i18n/getDictionary";

type AuthResponse = {
  token: string;
  employee: { id: string; employeeNumber: string; name: string; phone: string; permissions: string[] };
};

export default function OnboardingForm({
  dict,
  errorsDict,
}: {
  dict: Dictionary["onboarding"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await apiFetch<AuthResponse>("/onboarding/first-admin", {
        method: "POST",
        body: JSON.stringify({ name, phone, pin, pinConfirm }),
      });
      setToken(response.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {dict.nameLabel}
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
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
      <label>
        {dict.pinConfirmLabel}
        <input
          type="password"
          name="pinConfirm"
          inputMode="numeric"
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value)}
          required
        />
      </label>
      {error && (
        <p role="alert" className="form-error-alert">
          <span aria-hidden="true" className="form-error-alert-icon">!</span>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {dict.submit}
      </button>
    </form>
  );
}
