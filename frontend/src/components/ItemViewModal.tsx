"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import SectionLoading from "@/components/SectionLoading";
import AttachmentUploader from "@/components/AttachmentUploader";
import type { InventoryItemDetail, ItemPurchaseLine, ItemRequestLine } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Same status palette the request list uses, so a status reads identically
// wherever it appears.
const REQUEST_STATUS_CLASS: Record<string, string> = {
  PENDING: "s-pending",
  APPROVED: "s-approved",
  POSTPONED: "s-postponed",
  REJECTED: "s-rejected",
  CLOSED: "s-closed",
};

// The legacy app's "بطاقة الصنف" card: basic info, purchase history, and
// need-request history, opened from a row click rather than a page load.
export default function ItemViewModal({
  itemId,
  dict,
  attachmentsDict,
  requestsDict,
  commonDict,
  canManage,
  onClose,
  onEdit,
}: {
  itemId: string;
  dict: Dictionary["warehouseItems"];
  attachmentsDict: Dictionary["attachments"];
  requestsDict: Dictionary["warehouseRequests"];
  commonDict: Dictionary["common"];
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [purchases, setPurchases] = useState<ItemPurchaseLine[] | null>(null);
  const [requests, setRequests] = useState<ItemRequestLine[] | null>(null);

  useEffect(() => {
    apiFetch<InventoryItemDetail>(`/warehouse/items/${itemId}`)
      .then(setItem)
      .catch(() => onClose());
    // The two histories are independent of the card itself -- a failure in
    // either leaves the rest of the card usable.
    apiFetch<ItemPurchaseLine[]>(`/warehouse/items/${itemId}/purchases`)
      .then(setPurchases)
      .catch(() => setPurchases([]));
    apiFetch<ItemRequestLine[]>(`/warehouse/items/${itemId}/requests`)
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [itemId, onClose]);

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal wide">
        <button type="button" className="modal-close" onClick={onClose} aria-label="close">
          ×
        </button>
        <div className="modal-head">
          <h3>{item ? `${dict.cardTitle} — ${item.nameAr}` : "..."}</h3>
        </div>
        <div className="modal-body">
          {!item ? (
            <SectionLoading />
          ) : (
            <>
              <h4 className="ps-section-title">{dict.cardBasicInfo}</h4>
              <dl className="info-grid">
                <dt>{dict.codeLabel}</dt>
                <dd className="mono">{item.code}</dd>
                <dt>{dict.categoryLabel}</dt>
                <dd>{item.category?.ar ?? "—"}</dd>
                <dt>{dict.columnDateAdded}</dt>
                <dd>{item.dateAdded ?? "—"}</dd>
                <dt>{dict.columnQuantity}</dt>
                <dd>
                  {item.quantity} {item.unit ?? ""}
                </dd>
                <dt>{dict.columnLastPurchase}</dt>
                <dd>{item.lastPurchasePrice ?? "—"}</dd>
                <dt>{dict.weightLabel}</dt>
                <dd>{item.weight ?? "—"}</dd>
              </dl>

              <h4 className="ps-section-title">{dict.cardPurchaseHistory}</h4>
              {!purchases ? (
                <SectionLoading />
              ) : purchases.length === 0 ? (
                <p className="panel-note" style={{ padding: 0 }}>
                  {dict.cardNoPurchases}
                </p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{dict.cardRequestDate}</th>
                        <th>{dict.cardInvoiceNumber}</th>
                        <th>{dict.columnQuantity}</th>
                        <th>{dict.cardUnitPrice}</th>
                        <th>{dict.cardTax}</th>
                        <th>{dict.cardLineTotal}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((line, i) => (
                        <tr key={`${line.invoiceId}-${i}`}>
                          <td>{line.invoiceDate ?? "—"}</td>
                          <td className="mono">{line.invoiceNumber}</td>
                          <td className="qty-num">
                            {line.quantity} {item.unit ?? ""}
                          </td>
                          <td className="qty-num">
                            {line.unitPrice ?? "—"} {commonDict.currency}
                          </td>
                          <td>
                            <span className="chip">{line.taxRate != null ? `${line.taxRate}%` : "—"}</span>
                          </td>
                          <td className="qty-num">
                            {line.lineTotal ?? "—"} {commonDict.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h4 className="ps-section-title">{dict.cardRequestHistory}</h4>
              {!requests ? (
                <SectionLoading />
              ) : requests.length === 0 ? (
                <p className="panel-note" style={{ padding: 0 }}>
                  {dict.cardNoRequests}
                </p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{dict.cardRequestDate}</th>
                        <th>{dict.cardRequester}</th>
                        <th>{dict.cardDepartment}</th>
                        <th>{dict.cardQuantityRequested}</th>
                        <th>{dict.columnStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((line, i) => (
                        <tr key={`${line.requestId}-${i}`}>
                          <td>{new Date(line.createdAt).toLocaleDateString()}</td>
                          <td>{line.requesterName ?? "—"}</td>
                          <td>{line.departmentName ?? "—"}</td>
                          <td className="qty-num">
                            {line.quantityRequested} {item.unit ?? ""}
                          </td>
                          <td>
                            <span className={`chip ${REQUEST_STATUS_CLASS[line.status] ?? ""}`}>
                              <span className="chip-dot" />
                              {requestsDict[
                                `status${line.status.charAt(0)}${line.status.slice(1).toLowerCase()}` as
                                  | "statusPending"
                                  | "statusApproved"
                                  | "statusPostponed"
                                  | "statusRejected"
                                  | "statusClosed"
                              ] ?? line.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="panel" style={{ marginTop: 16 }}>
                <AttachmentUploader
                  ownerType="INVENTORY_ITEM"
                  ownerId={item.id}
                  dict={attachmentsDict}
                  canManage={canManage}
                  showUpload={false}
                />
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          {canManage && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onEdit}>
              {dict.cardEdit}
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            {commonDict.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
