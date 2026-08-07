"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AttachmentDto, BrandingDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Fixed synthetic owner id for the single branding row — branding_setting
// has no UUID id of its own (it's a single-row table keyed by a boolean).
const BRANDING_OWNER_ID = "00000000-0000-0000-0000-000000000000";

const PRESETS: { key: string; color: string }[] = [
  { key: "default", color: "#0f766e" },
  { key: "blue", color: "#2563eb" },
  { key: "purple", color: "#7c3aed" },
  { key: "green", color: "#16a34a" },
  { key: "red", color: "#dc2626" },
];

export default function BrandingAdmin({ dict }: { dict: Dictionary["branding"] }) {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [preset, setPreset] = useState("default");
  const [color, setColor] = useState("#0f766e");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    apiFetch<BrandingDto>("/branding")
      .then((b) => {
        setBranding(b);
        setPreset(b.preset);
        setColor(b.primaryColor);
      })
      .catch(() => router.replace("/dashboard"));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSave() {
    if (!branding) return;
    setError(null);
    try {
      const updated = await apiFetch<BrandingDto>("/branding", {
        method: "PUT",
        body: JSON.stringify({
          preset,
          primaryColor: color,
          logoAttachmentId: null,
          version: branding.version,
        }),
      });
      setBranding(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !branding) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("ownerType", "BRANDING");
      formData.append("ownerId", BRANDING_OWNER_ID);
      formData.append("file", file);
      const uploaded = await apiUpload<AttachmentDto>(
        `/attachments?ownerType=BRANDING&ownerId=${BRANDING_OWNER_ID}`,
        formData
      );
      const updated = await apiFetch<BrandingDto>("/branding", {
        method: "PUT",
        body: JSON.stringify({
          preset,
          primaryColor: color,
          logoAttachmentId: uploaded.id,
          version: branding.version,
        }),
      });
      setBranding(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    const updated = await apiFetch<BrandingDto>("/branding/reset", { method: "POST" });
    setBranding(updated);
    setPreset(updated.preset);
    setColor(updated.primaryColor);
  }

  if (!branding) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      {error && <p role="alert">{error}</p>}

      <label>
        {dict.presetLabel}
        <div>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPreset(p.key);
                setColor(p.color);
              }}
              style={{
                background: p.color,
                width: 32,
                height: 32,
                border: preset === p.key ? "3px solid black" : "1px solid #ccc",
              }}
            />
          ))}
        </div>
      </label>

      <label>
        {dict.colorLabel}
        <input
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setPreset("custom");
          }}
        />
      </label>

      <div style={{ background: color, color: "white", padding: "1rem", marginTop: "1rem" }}>{dict.title}</div>

      <label>
        {dict.logoLabel}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} disabled={uploading} />
      </label>
      {branding.logoUrl && <img src={branding.logoUrl} alt="logo" style={{ maxWidth: 200 }} />}

      <p>
        <button type="button" onClick={handleSave}>
          {dict.save}
        </button>
        <button type="button" onClick={handleReset}>
          {dict.reset}
        </button>
      </p>
    </main>
  );
}
