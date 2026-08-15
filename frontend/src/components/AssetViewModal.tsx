"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import SectionLoading from "@/components/SectionLoading";
import type { AssetDetail, AssetTransferDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

const STATUS_CHIP_CLASS: Record<string, string> = {
  ACTIVE: "s-approved",
  MAINTENANCE: "s-pending",
  RETIRED: "s-postponed",
};

export default function AssetViewModal({
  assetId,
  dict,
  commonDict,
  canManage,
  onClose,
  onEdit,
  onChanged,
}: {
  assetId: string;
  dict: Dictionary["assets"];
  commonDict: Dictionary["common"];
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [transfers, setTransfers] = useState<AssetTransferDto[] | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setQrUrl(null);
    apiFetch<AssetDetail>(`/assets/${assetId}`).then(setAsset).catch(() => onClose());
    apiFetch<AssetTransferDto[]>(`/assets/${assetId}/transfers`).then(setTransfers).catch(() => {});
    apiFetchBlob(`/assets/${assetId}/qr`)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setQrUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, onClose]);

  async function downloadQr() {
    const blob = await apiFetchBlob(`/assets/${assetId}/qr`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset?.assetNumber ?? "asset"}-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printSticker() {
    if (!asset || !qrUrl) return;
    const w = window.open("", "_blank", "width=400,height=500");
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><title>${asset.assetNumber}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:20px}
      img{max-width:200px}h2{margin:8px 0}p{margin:4px 0;font-size:14px}</style></head>
      <body><h2>${asset.nameAr}</h2><p>${asset.assetNumber}</p>
      <img src="${qrUrl}" />
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  function statusLabel(status: string) {
    return { ACTIVE: dict.statusActive, MAINTENANCE: dict.statusMaintenance, RETIRED: dict.statusRetired }[status] ?? status;
  }

  function fmt(v: number | null) {
    return v != null ? String(v) : "—";
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal wide">
        {/* Same head as "بطاقة الصنف": identity split into kicker, name and
            code instead of one run-on title, and the close button inside the
            head so it lands at the end edge -- the left, in RTL. */}
        <div className="modal-head item-card-head">
          <div className="item-card-heading">
            <span className="item-card-kicker">{dict.cardTitle}</span>
            <h3>{asset ? asset.nameAr : "…"}</h3>
            {asset && (
              <span className="item-card-code mono">
                {asset.assetNumber}
                {asset.category?.ar ? ` · ${asset.category.ar}` : ""}
              </span>
            )}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="close">×</button>
        </div>
        <div className="modal-body">
          {!asset ? (
            <SectionLoading />
          ) : (
            <div className="asset-card-split">
              <div className="asset-card-facts">
                <h4 className="ps-section-title">{dict.cardBasicInfo}</h4>
                <dl className="info-grid">
                  <dt>{dict.categoryLabel}</dt>
                  <dd>{asset.category?.ar ?? "—"}</dd>
                  <dt>{dict.roomLabel}</dt>
                  <dd>{asset.room?.ar ?? "—"}</dd>
                  <dt>{dict.custodianLabel}</dt>
                  <dd>{asset.custodianName ?? "—"}</dd>
                  <dt>{dict.statusLabel}</dt>
                  <dd>
                    <span className={`chip ${STATUS_CHIP_CLASS[asset.status] ?? ""}`}>
                      <span className="chip-dot" />
                      {statusLabel(asset.status)}
                    </span>
                  </dd>
                  <dt>{dict.acquisitionDateLabel}</dt>
                  <dd>{asset.acquisitionDate ?? "—"}</dd>
                  <dt>{dict.depreciationRateLabel}</dt>
                  <dd>{fmt(asset.depreciationRate)}</dd>
                  <dt>{dict.accumulatedDepreciationLabel}</dt>
                  <dd>{fmt(asset.accumulatedDepreciation)}</dd>
                  <dt>{dict.periodEndDateLabel}</dt>
                  <dd>{asset.periodEndDate ?? "—"}</dd>
                  <dt>{dict.periodEndBalanceLabel}</dt>
                  <dd>{fmt(asset.periodEndBalance)}</dd>
                  <dt>{dict.notesLabel}</dt>
                  <dd>{asset.notes ?? "—"}</dd>
                </dl>

              </div>

              <div className="asset-card-qr">
                {qrUrl ? <img src={qrUrl} alt="QR" /> : <SectionLoading />}
                <div className="asset-card-qr-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={downloadQr}>
                    {dict.downloadQr}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={printSticker} disabled={!qrUrl}>
                    {dict.printSticker}
                  </button>
                </div>
              </div>
            </div>
          )}

          {asset && (
            <div className="asset-card-transfers">
              <h4 className="ps-section-title">{dict.transferLog}</h4>
              {!transfers || transfers.length === 0 ? (
                <p className="asset-card-empty">{dict.noTransfers}</p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{dict.roomLabel}</th>
                        <th>{dict.custodianLabel}</th>
                        <th>{dict.notesLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((t, i) => (
                        <tr key={i}>
                          <td>{t.toRoom ? t.toRoom.ar : "—"}</td>
                          <td>{t.toEmployeeName ?? "—"}</td>
                          <td>{t.reason ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            {dict.close}
          </button>
          {canManage && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>
              {dict.editAsset}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
