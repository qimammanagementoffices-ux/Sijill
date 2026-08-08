"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AttachmentDto, BrandingDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

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
          logoAttachmentId: branding.logoAttachmentId,
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
      const previousLogoAttachmentId = branding.logoAttachmentId;
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
      // Replacing the logo previously left the old attachment row/storage
      // file orphaned. Clean up the superseded one now that the new
      // reference is safely saved.
      if (previousLogoAttachmentId && previousLogoAttachmentId !== uploaded.id) {
        try {
          await apiFetch(`/attachments/${previousLogoAttachmentId}`, { method: "DELETE" });
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
        }
      }
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

  if (!branding) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="panel">
        <div className="panel-body">
          <div className="field" style={{ marginBottom: 18 }}>
            <label>{dict.presetLabel}</label>
            <div className="preset-row">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`preset-swatch${preset === p.key ? " active" : ""}`}
                  onClick={() => {
                    setPreset(p.key);
                    setColor(p.color);
                  }}
                >
                  <span className="preset-dots" style={{ background: p.color }} />
                  <span className="preset-label">{p.key}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginBottom: 18 }}>
            <label>{dict.colorLabel}</label>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setPreset("custom");
              }}
              style={{ width: 60, height: 36, border: "1.5px solid var(--line)", borderRadius: 8, padding: 2 }}
            />
          </div>

          <div
            style={{
              background: color,
              color: "white",
              padding: "1rem",
              borderRadius: "var(--radius)",
              marginBottom: 18,
              fontWeight: 700,
            }}
          >
            {dict.title}
          </div>

          <div className="branding-row">
            {branding.logoUrl && <img src={branding.logoUrl} alt="logo" style={{ maxWidth: 120, borderRadius: 8 }} />}
            <div className="filebox" style={{ flex: 1 }}>
              <label className="upl">
                {dict.logoLabel}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              {uploading && <span className="spinner" />}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
              {dict.save}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleReset}>
              {dict.reset}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
