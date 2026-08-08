"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AssetListItem, AssetRequestDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

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

  if (!assets) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.addNew}</h1>
      <form onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-body">
            <div className="form-grid">
              <div className="field span2">
                <label>{dict.assetLabel}</label>
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
                  <option value="">—</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetNumber} — {asset.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field span2">
                <label>{dict.reasonLabel}</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting && <span className="spinner" />}
          {dict.submit}
        </button>
      </form>
    </>
  );
}
