"use client";

import { useState } from "react";

// Falls back to the "س" glyph if the logo fails to load -- e.g. a stale
// cached branding response (getBranding revalidates every 60s) still
// pointing at a just-deleted logo attachment.
export default function BrandSeal({ logoUrl, className }: { logoUrl: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = logoUrl && !broken;

  return <div className={className}>{showImage ? <img src={logoUrl} alt="" onError={() => setBroken(true)} /> : "س"}</div>;
}
