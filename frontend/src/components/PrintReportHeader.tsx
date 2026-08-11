"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { BrandingDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import { useEntityLocale } from "@/i18n/entityName";

// Shared header for every printable A4 report (master spec §7): branding
// logo/name, report title, generated timestamp, and an optional
// filters-summary line so a printed page shows what it's scoped to.
// schoolName/schoolLabel (from BrandingAdmin's "identity" fields) print
// under the platform name/logo when the admin has set them -- otherwise
// this falls back to just the platform name, same as before those fields
// existed.
export default function PrintReportHeader({
  title,
  filtersSummary,
  dict,
}: {
  title: string;
  filtersSummary?: string;
  dict: Dictionary["common"];
}) {
  const [branding, setBranding] = useState<BrandingDto | null>(null);
  const locale = useEntityLocale();

  useEffect(() => {
    apiFetch<BrandingDto>("/branding")
      .then(setBranding)
      .catch(() => {});
  }, []);

  const platformName = locale === "en" ? branding?.platformNameEn || branding?.platformName : locale === "hi" ? branding?.platformNameHi || branding?.platformName : branding?.platformName;
  const schoolName = locale === "en" ? branding?.schoolNameEn || branding?.schoolName : locale === "hi" ? branding?.schoolNameHi || branding?.schoolName : branding?.schoolName;

  return (
    <header className="ps-header">
      <div className="ps-header-left">
        {branding?.logoUrl && (
          <div className="ps-seal">
            <img src={branding.logoUrl} alt="" />
          </div>
        )}
        <div className="ps-school">
          <div className="n1">{platformName || dict.appName}</div>
          {schoolName && <div className="n2">{schoolName}</div>}
          {branding?.schoolLabel && <div className="n2">{branding.schoolLabel}</div>}
        </div>
      </div>
      <div className="ps-doc-meta">
        <div>{title}</div>
        {filtersSummary && <div>{filtersSummary}</div>}
        <div>
          {dict.generatedAt}: {new Date().toLocaleString()}
        </div>
      </div>
    </header>
  );
}
