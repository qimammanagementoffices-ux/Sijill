import "server-only";
import type { BrandingDto } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

// Shared by app/layout.tsx (for --brand-primary/--brand-accent) and
// app/(app)/layout.tsx (for the sidebar's platform name/logo) -- same
// revalidate window as the root layout's original inline version, so
// Next's fetch cache dedupes the two calls into one request per window
// rather than issuing it twice per page load.
export async function getBranding(): Promise<BrandingDto> {
  const res = await fetch(`${API_URL}/branding`, { next: { revalidate: 60, tags: ["branding"] } });
  if (!res.ok) {
    return {
      preset: "default",
      primaryColor: "#0f766e",
      accentColor: "#8B2635",
      platformName: null,
      schoolName: null,
      schoolLabel: null,
      subtitle: null,
      logoAttachmentId: null,
      logoUrl: null,
      version: 0,
    };
  }
  return res.json();
}
