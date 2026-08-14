"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { fetchAllPaged } from "@/lib/fetchAllPaged";
import AttachmentUploader from "@/components/AttachmentUploader";
import PendingAttachmentPicker from "@/components/PendingAttachmentPicker";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
import TableFooter from "@/components/TableFooter";
import Toast from "@/components/Toast";
import TableSearch from "@/components/TableSearch";
import type { AssetAcquisitionDto, AssetListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Draft = { documentNumber: string; documentDate: string; vendor: string; amount: string; notes: string; assetIds: string[] };
const emptyDraft = (): Draft => ({ documentNumber: "", documentDate: new Date().toISOString().slice(0, 10), vendor: "", amount: "0", notes: "", assetIds: [] });

export default function AssetAcquisitionList({ dict, commonDict, attachmentsDict }: {
  dict: Dictionary["assetAcquisitions"];
  commonDict: Dictionary["common"];
  attachmentsDict: Dictionary["attachments"];
}) {
  const router = useRouter();
  const [page, setPage] = useState<PagedResponse<AssetAcquisitionDto> | null>(null);
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [size, setSize] = useState(10);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [editing, setEditing] = useState<AssetAcquisitionDto | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [printRecord, setPrintRecord] = useState<AssetAcquisitionDto | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const requestSequence = useRef(0);

  function queryString(pageNumber: number, perPage: number, query: string, selectedAsset: string, from: string, to: string) {
    const params = new URLSearchParams({ page: String(pageNumber), size: String(perPage) });
    params.append("sort", "documentDate,desc"); params.append("sort", "id,asc");
    if (query) params.set("q", query);
    if (selectedAsset) params.set("assetId", selectedAsset);
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    return `?${params.toString()}`;
  }

  function load(pageNumber = 0, perPage = size, query = appliedQuery, selectedAsset = assetFilter, from = dateFrom, to = dateTo) {
    const sequence = ++requestSequence.current;
    setLoadingPage(pageNumber);
    apiFetch<PagedResponse<AssetAcquisitionDto>>(`/assets/acquisitions${queryString(pageNumber, perPage, query, selectedAsset, from, to)}`)
      .then((next) => { if (sequence === requestSequence.current) setPage(next); })
      .catch((err) => { if (err instanceof ApiError && (err.status === 401 || err.status === 403)) router.replace("/dashboard"); })
      .finally(() => { if (sequence === requestSequence.current) setLoadingPage(null); });
  }

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    load();
    apiFetch<{ permissions: string[] }>("/auth/me").then((me) => setCanManage(me.permissions.includes("as.manage"))).catch(() => {});
    fetchAllPaged<AssetListItem>((pageNumber) => `/assets?page=${pageNumber}&size=100&sort=assetNumber,asc`).then(setAssets).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function search(e: FormEvent) { e.preventDefault(); setAppliedQuery(q); load(0, size, q); }
  function openCreate() { setEditing(null); setDraft(emptyDraft()); setPendingFiles([]); setError(null); }
  function openEdit(record: AssetAcquisitionDto) {
    setEditing(record); setError(null);
    setDraft({ documentNumber: record.documentNumber, documentDate: record.documentDate, vendor: record.vendor ?? "", amount: String(record.amount), notes: record.notes ?? "", assetIds: record.assets.map((a) => a.id) });
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const body = { ...draft, amount: Number(draft.amount) || 0, vendor: draft.vendor || null, notes: draft.notes || null, version: editing?.version ?? null };
      const saved = await apiFetch<AssetAcquisitionDto>(editing ? `/assets/acquisitions/${editing.id}` : "/assets/acquisitions", { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
      setEditing(saved);
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append("ownerType", "ASSET_ACQUISITION");
        formData.append("ownerId", saved.id);
        formData.append("file", file);
        await apiUpload(`/attachments?ownerType=ASSET_ACQUISITION&ownerId=${saved.id}`, formData);
      }
      setPendingFiles([]); load(page?.page ?? 0); setToast(commonDict.actionSuccess);
    } catch (err) { setError(err instanceof ApiError ? err.message : String(err)); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!editing || !window.confirm(dict.delete)) return;
    await apiFetch(`/assets/acquisitions/${editing.id}`, { method: "DELETE" });
    setEditing(undefined); load(0); setToast(commonDict.actionSuccess);
  }

  async function print(record: AssetAcquisitionDto) {
    setPrintRecord(record);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    window.print(); setPrintRecord(null);
  }

  if (!page) return <SectionLoading />;
  return <>
    <div className="no-print"><div className="eyebrow">{dict.title}</div><h1 className="section-title disp">{dict.title}</h1></div>
    <div className="print-only"><PrintReportHeader title={dict.title} dict={commonDict} />{printRecord && <div className="panel-body"><div className="ps-grid"><div className="ps-cell"><span className="k">{dict.documentNumber}</span><span className="v mono">{printRecord.documentNumber}</span></div><div className="ps-cell"><span className="k">{dict.documentDate}</span><span className="v mono">{printRecord.documentDate}</span></div><div className="ps-cell"><span className="k">{dict.vendor}</span><span className="v">{printRecord.vendor ?? "—"}</span></div><div className="ps-cell"><span className="k">{dict.amount}</span><span className="v mono">{printRecord.amount.toFixed(2)} {commonDict.currency}</span></div></div><h3 className="ps-section-title">{dict.assets}</h3><table><tbody>{printRecord.assets.map((a) => <tr key={a.id}><td>{a.nameAr}</td><td className="mono">{a.assetNumber}</td></tr>)}</tbody></table>{printRecord.notes && <><h3 className="ps-section-title">{dict.notes}</h3><p>{printRecord.notes}</p></>}</div>}</div>
    <div className="panel no-print">
      <div className="panel-head table-toolbar"><form className="filter-row" onSubmit={search}><TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={commonDict.search} /><select value={assetFilter} onChange={(e) => { const next = e.target.value; setAssetFilter(next); load(0, size, appliedQuery, next); }}><option value="">{dict.allAssets}</option>{assets.map((a) => <option key={a.id} value={a.id}>{a.assetNumber} — {a.nameAr}</option>)}</select><div className="date-range-filter" role="group" aria-label={dict.documentDate}><span className="date-range-label">{dict.documentDate}</span><input type="date" aria-label={dict.documentDate} value={dateFrom} max={dateTo || undefined} onChange={(e) => { const nextFrom = e.target.value; const nextTo = nextFrom && dateTo && nextFrom > dateTo ? "" : dateTo; setDateFrom(nextFrom); setDateTo(nextTo); load(0, size, appliedQuery, assetFilter, nextFrom, nextTo); }} /><input type="date" aria-label={dict.documentDate} value={dateTo} min={dateFrom || undefined} onChange={(e) => { const nextTo = e.target.value; const nextFrom = nextTo && dateFrom && nextTo < dateFrom ? "" : dateFrom; setDateTo(nextTo); setDateFrom(nextFrom); load(0, size, appliedQuery, assetFilter, nextFrom, nextTo); }} /></div></form>{canManage && <div className="table-toolbar-actions"><button className="btn btn-primary btn-sm" type="button" onClick={openCreate}>{dict.addNew}</button></div>}</div>
      {page.content.length === 0 ? <div className="empty"><b>{dict.noResults}</b></div> : <div className="table-scroll table-loading-wrap">{loadingPage !== null && <div className="table-loading-veil"><span className="spinner spinner-lg" /></div>}<table><thead><tr><th>{dict.documentNumber}</th><th>{dict.documentDate}</th><th>{dict.vendor}</th><th>{dict.assetCount}</th><th>{dict.amount}</th></tr></thead><tbody>{page.content.map((record) => <tr key={record.id} className="clickable" onClick={() => openEdit(record)}><td className="mono">{record.documentNumber}</td><td className="mono">{record.documentDate}</td><td>{record.vendor ?? "—"}</td><td><span className="count-badge">{record.assets.length}</span></td><td className="mono">{record.amount.toFixed(2)} {commonDict.currency}</td></tr>)}</tbody></table></div>}
      <TableFooter page={page.page} totalPages={page.totalPages} size={size} loadingPage={loadingPage} rowsPerPageLabel={commonDict.rowsPerPage} onPage={load} onSize={(next) => { setSize(next); load(0, next); }} />
    </div>
    {editing !== undefined && <div className="overlay no-print" role="dialog" aria-modal="true"><div className="modal wide acquisition-modal"><div className="modal-head"><h3>{editing ? dict.editTitle : dict.addNew}</h3><button className="modal-close" type="button" onClick={() => setEditing(undefined)}>×</button></div><div className="modal-body"><form id="acquisition-form" onSubmit={save} className="form-grid acquisition-form"><div className="field"><label>{dict.documentNumber}</label><input required placeholder="مثال: INV-2026-001" value={draft.documentNumber} onChange={(e) => setDraft({ ...draft, documentNumber: e.target.value })} /></div><div className="field"><label>{dict.documentDate}</label><input type="date" required value={draft.documentDate} onChange={(e) => setDraft({ ...draft, documentDate: e.target.value })} /></div><div className="field"><label>{dict.vendor}</label><input placeholder="مثال: مؤسسة التجهيزات المدرسية" value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} /></div><div className="field"><label>{dict.amount}</label><input type="number" min="0" step="0.01" placeholder="0.00" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div><div className="field span2"><label>{dict.assets}</label><div className="tag-editor">{draft.assetIds.length === 0 && <span>{dict.noAssets}</span>}{draft.assetIds.map((id) => { const asset = assets.find((a) => a.id === id); return <span className="tag" key={id}>{asset ? `${asset.nameAr} (${asset.assetNumber})` : id}<button type="button" onClick={() => setDraft({ ...draft, assetIds: draft.assetIds.filter((x) => x !== id) })}>×</button></span>; })}</div><select value="" onChange={(e) => e.target.value && setDraft({ ...draft, assetIds: [...draft.assetIds, e.target.value] })}><option value="">{dict.addAsset}</option>{assets.filter((a) => !draft.assetIds.includes(a.id)).map((a) => <option key={a.id} value={a.id}>{a.assetNumber} — {a.nameAr}</option>)}</select></div><div className="field span2"><label>{dict.notes}</label><textarea placeholder="أي ملاحظات عن الفاتورة أو العقد..." value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>{!editing && <div className="field span2"><label>{attachmentsDict.title}</label><PendingAttachmentPicker files={pendingFiles} uploadLabel={attachmentsDict.upload} emptyLabel={attachmentsDict.noAttachments} hint="JPEG، PNG، WebP أو PDF — بحد أقصى 2 MB للملف" onSelect={(selected) => setPendingFiles((current) => [...current, ...selected])} onRemove={(index) => setPendingFiles((current) => current.filter((_, i) => i !== index))} removeLabel={attachmentsDict.delete} /></div>}</form>{error && <p role="alert" style={{ color: "var(--seal)" }}>{error}</p>}{editing && <AttachmentUploader ownerType="ASSET_ACQUISITION" ownerId={editing.id} dict={attachmentsDict} canManage={canManage} onAction={() => setToast(commonDict.actionSuccess)} />}</div><div className="modal-foot">{editing && <><button className="btn btn-seal btn-sm" type="button" onClick={() => void remove()}>{dict.delete}</button><button className="btn btn-outline btn-sm" type="button" onClick={() => void print(editing)}>{commonDict.print}</button></>}<div style={{ flex: 1 }} /><button className="btn btn-outline btn-sm" type="button" onClick={() => setEditing(undefined)}>{commonDict.cancel}</button><button className="btn btn-primary btn-sm" form="acquisition-form" type="submit" disabled={saving}>{saving && <span className="spinner" />}{dict.save}</button></div></div></div>}
    {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
  </>;
}
