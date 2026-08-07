"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { BrandingDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Shared header for every printable A4 report (master spec §7): branding
// logo/name, report title, generated timestamp, and an optional
// filters-summary line so a printed page shows what it's scoped to.
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

  useEffect(() => {
    apiFetch<BrandingDto>("/branding")
      .then(setBranding)
      .catch(() => {});
  }, []);

  return (
    <header style={{ borderBottom: "2px solid #ccc", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {branding?.logoUrl && <img src={branding.logoUrl} alt="" style={{ height: 40 }} />}
        <strong>{dict.appName}</strong>
      </div>
      <h1>{title}</h1>
      {filtersSummary && <p>{filtersSummary}</p>}
      <p>{dict.generatedAt}: {new Date().toLocaleString()}</p>
    </header>
  );
}
