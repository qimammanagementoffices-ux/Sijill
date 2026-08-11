"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AttachmentDto, BrandingDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

// Fixed synthetic owner id for the single branding row — branding_setting
// has no UUID id of its own (it's a single-row table keyed by a boolean).
const BRANDING_OWNER_ID = "00000000-0000-0000-0000-000000000000";

// Each preset is a primary+accent pair (the two colors this app actually
// uses); the swatch itself blends in two extra shades purely so it reads
// as a richer "theme" preview, matching the reference site's quadrant
// swatches -- those extra shades aren't stored anywhere, just decorative.
const PRESETS: { key: string; primary: string; accent: string; labelKey: keyof Dictionary["branding"] }[] = [
  { key: "default", primary: "#1B2A4A", accent: "#8B2635", labelKey: "presetDefault" },
  { key: "green", primary: "#16653F", accent: "#B4791E", labelKey: "presetGreen" },
  { key: "blue", primary: "#1D4ED8", accent: "#B4791E", labelKey: "presetBlue" },
  { key: "purple", primary: "#4C1D95", accent: "#8B2635", labelKey: "presetPurple" },
  { key: "gray", primary: "#374151", accent: "#8B2635", labelKey: "presetGray" },
];

function swatchGradient(primary: string, accent: string): string {
  return `conic-gradient(${primary} 0% 25%, ${accent} 25% 50%, ${primary} 50% 75%, ${accent} 75% 100%)`;
}

// BrandingAdmin talks to the Spring Boot backend directly, so Next's own
// cached getBranding() response (login page, sidebar) doesn't know branding
// just changed and would otherwise keep serving the old value for its 60s
// window. Best-effort -- a failure here just means that window applies.
function revalidateBranding() {
  fetch("/api/revalidate-branding", { method: "POST" }).catch(() => {});
}

export default function BrandingAdmin({ dict }: { dict: Dictionary["branding"] }) {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const [preset, setPreset] = useState("default");
  const [color, setColor] = useState("#0f766e");
  const [accentColor, setAccentColor] = useState("#8B2635");
  const [platformName, setPlatformName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolLabel, setSchoolLabel] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    apiFetch<BrandingDto>("/branding")
      .then((b) => {
        setBranding(b);
        setPreset(b.preset);
        setColor(b.primaryColor);
        setAccentColor(b.accentColor);
        setPlatformName(b.platformName ?? "");
        setSchoolName(b.schoolName ?? "");
        setSchoolLabel(b.schoolLabel ?? "");
        setSubtitle(b.subtitle ?? "");
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

  function payload(logoAttachmentId: string | null | undefined, version: number) {
    return {
      preset,
      primaryColor: color,
      accentColor,
      platformName: platformName || null,
      schoolName: schoolName || null,
      schoolLabel: schoolLabel || null,
      subtitle: subtitle || null,
      logoAttachmentId: logoAttachmentId !== undefined ? logoAttachmentId : branding?.logoAttachmentId ?? null,
      version,
    };
  }

  async function handleSave() {
    if (!branding) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await apiFetch<BrandingDto>("/branding", {
        method: "PUT",
        body: JSON.stringify(payload(undefined, branding.version)),
      });
      setBranding(updated);
      setToast(dict.saveSuccess);
      revalidateBranding();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
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
      let updated: BrandingDto;
      try {
        updated = await apiFetch<BrandingDto>("/branding", {
          method: "PUT",
          body: JSON.stringify(payload(uploaded.id, branding.version)),
        });
      } catch (err) {
        // The upload is not referenced when the settings update fails.
        // Best-effort cleanup prevents an orphaned Supabase object while
        // preserving the original update error for the user.
        try {
          await apiFetch(`/attachments/${uploaded.id}`, { method: "DELETE" });
        } catch {}
        throw err;
      }
      setBranding(updated);
      setToast(dict.saveSuccess);
      revalidateBranding();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoRemove() {
    if (!branding?.logoAttachmentId || uploading) return;
    setError(null);
    setUploading(true);
    try {
      const updated = await apiFetch<BrandingDto>("/branding", {
        method: "PUT",
        body: JSON.stringify(payload(null, branding.version)),
      });
      setBranding(updated);
      setToast(dict.saveSuccess);
      revalidateBranding();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    if (!window.confirm(dict.resetConfirm)) return;
    const updated = await apiFetch<BrandingDto>("/branding/reset", { method: "POST" });
    setBranding(updated);
    setPreset(updated.preset);
    setColor(updated.primaryColor);
    setAccentColor(updated.accentColor);
    setPlatformName(updated.platformName ?? "");
    setSchoolName(updated.schoolName ?? "");
    setSchoolLabel(updated.schoolLabel ?? "");
    setSubtitle(updated.subtitle ?? "");
    setToast(dict.saveSuccess);
    revalidateBranding();
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
          <div className="branding-row">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="logo" style={{ maxWidth: 90, borderRadius: 8 }} />
            ) : (
              <div className="brand-seal" style={{ background: "var(--paper-dim)", color: "var(--ink)" }}>
                س
              </div>
            )}
            <div className="filebox" style={{ flex: 1 }}>
              <label className="upl">
                {dict.uploadLogo}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              {branding.logoUrl && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogoRemove} disabled={uploading}>
                  {dict.removeLogo}
                </button>
              )}
              {uploading && <span className="spinner" />}
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: 18 }}>
            <div className="field">
              <label>{dict.schoolNameLabel}</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} dir="rtl" />
            </div>
            <div className="field">
              <label>{dict.platformNameLabel}</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder={dict.platformNamePlaceholder}
              />
            </div>
            <div className="field span2">
              <label>{dict.schoolLabelLabel}</label>
              <input type="text" value={schoolLabel} onChange={(e) => setSchoolLabel(e.target.value)} dir="rtl" />
            </div>
            <div className="field span2">
              <label>{dict.subtitleLabel}</label>
              <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} dir="rtl" />
            </div>
          </div>

          <div className="field" style={{ marginTop: 18 }}>
            <label>{dict.presetLabel}</label>
            <div className="preset-row">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`preset-swatch${preset === p.key ? " active" : ""}`}
                  onClick={() => {
                    setPreset(p.key);
                    setColor(p.primary);
                    setAccentColor(p.accent);
                  }}
                >
                  <span className="preset-dots" style={{ background: swatchGradient(p.primary, p.accent) }} />
                  <span className="preset-label">{dict[p.labelKey]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: 4 }}>
            <div className="field">
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
            <div className="field">
              <label>{dict.accentColorLabel}</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => {
                  setAccentColor(e.target.value);
                  setPreset("custom");
                }}
                style={{ width: 60, height: 36, border: "1.5px solid var(--line)", borderRadius: 8, padding: 2 }}
              />
            </div>
          </div>
        </div>
        <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)", display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleReset}>
            {dict.reset}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner" />}
            {dict.save}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
