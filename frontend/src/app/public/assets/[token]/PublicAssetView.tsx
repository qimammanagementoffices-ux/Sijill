"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { LocalizedRef } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type PublicAssetDto = {
  assetNumber: string;
  nameAr: string;
  nameEn: string;
  category: LocalizedRef | null;
  room: LocalizedRef | null;
  status: string;
};

export default function PublicAssetView({ token, dict }: { token: string; dict: Dictionary["publicAsset"] }) {
  const [asset, setAsset] = useState<PublicAssetDto | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch<PublicAssetDto>(`/public/assets/${token}`)
      .then(setAsset)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        }
      });
  }, [token]);

  if (notFound) {
    return (
      <main style={{ maxWidth: 500, margin: "10vh auto", padding: "0 1rem" }}>
        <p>{dict.notFound}</p>
      </main>
    );
  }

  if (!asset) return null;

  return (
    <main style={{ maxWidth: 500, margin: "10vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      <p>{asset.assetNumber}</p>
      <p>{asset.nameAr}</p>
      <p>{asset.nameEn}</p>
      <p>{asset.category ? asset.category.ar : ""}</p>
      <p>{asset.room ? asset.room.ar : ""}</p>
      <p>{asset.status}</p>
    </main>
  );
}
