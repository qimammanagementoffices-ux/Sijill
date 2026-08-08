"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AssetListItem, AssetRequestDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function NewAssetRequestView({
  dict,
  errorsDict,
}: {
  dict: Dictionary["assetRequests"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
  const [assets, setAssets] = useState<AssetListItem[] | null>(null);
  const [assetId, setAssetId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<PagedResponse<AssetListItem>>("/assets?size=200")
      .then((p) => setAssets(p.content))
      .catch(() => router.replace("/asset-requests"));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<AssetRequestDetail>("/asset-requests", {
        method: "POST",
        body: JSON.stringify({ assetId: assetId || null, reason: reason || null }),
      });
      router.push(`/asset-requests/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!assets) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.addNew}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {dict.assetLabel}
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
            <option value="">—</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.assetNumber} — {asset.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label>
          {dict.reasonLabel}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>

        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {dict.submit}
        </button>
      </form>
    </main>
  );
}
