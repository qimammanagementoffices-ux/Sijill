"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/apiClient";
import { entityName, useEntityLocale } from "@/i18n/entityName";
import type {
  AssetRequestOption,
  AssetRequestDetail,
  AssetRequestListItem,
  AssetRequestPurpose,
  AttachmentDto,
  CategoryDto,
  LocalizedEntityDto,
  LocalizedRef,
  RoomOption,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import DepartmentHierarchyPicker, { flattenDepartmentHierarchy } from "@/components/DepartmentHierarchyPicker";
import PendingAttachmentPicker from "@/components/PendingAttachmentPicker";
import SearchablePicker from "@/components/SearchablePicker";
import usePagedPickerOptions from "@/lib/usePagedPickerOptions";

type MeData = { departments: LocalizedRef[] };

export default function NewAssetRequestView({
  dict,
  errorsDict,
  onSubmitted,
  formId,
  onSubmittingChange,
  editing,
}: {
  dict: Dictionary["assetRequests"];
  errorsDict: Dictionary["errors"];
  onSubmitted: (request: AssetRequestDetail) => void;
  formId?: string;
  onSubmittingChange?: (submitting: boolean) => void;
  // The requester correcting their own request inside the edit window. Same
  // form, PUT instead of POST.
  editing?: AssetRequestListItem;
}) {
  const entityLocale = useEntityLocale();
  const [me, setMe] = useState<MeData | null>(null);
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [rooms, setRooms] = useState<RoomOption[] | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [departmentId, setDepartmentId] = useState(editing?.department?.id ?? "");
  const [roomId, setRoomId] = useState(editing?.room?.id ?? "");
  const [destinationRoomId, setDestinationRoomId] = useState(editing?.destinationRoom?.id ?? "");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">(
    editing?.priority === "URGENT" ? "URGENT" : "NORMAL"
  );
  const [purpose, setPurpose] = useState<AssetRequestPurpose>(
    (editing?.purpose as AssetRequestPurpose) ?? "PURCHASE"
  );
  const [categoryQuantities, setCategoryQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (editing?.lines ?? [])
        .filter((line) => line.categoryId)
        .map((line) => [line.categoryId as string, line.quantity])
    )
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set((editing?.lines ?? []).map((line) => line.assetId).filter((id): id is string => !!id))
  );
  const [reason, setReason] = useState(editing?.reason ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialAssets = useMemo<AssetRequestOption[]>(() =>
    (editing?.lines ?? []).filter((line) => line.assetId).map((line) => ({
      id: line.assetId as string,
      assetNumber: line.assetNumber ?? "",
      nameAr: line.assetNameAr ?? "",
      nameEn: line.assetNameEn ?? "",
      category: line.categoryId ? {
        id: line.categoryId,
        ar: line.categoryNameAr ?? "",
        en: line.categoryNameEn ?? "",
      } : null,
      room: editing?.room ?? null,
      status: "ACTIVE",
    })), [editing]
  );
  const assetPath = `/assets/request-options?sort=assetNumber,asc&sort=id,asc${roomId ? `&roomId=${encodeURIComponent(roomId)}` : ""}`;
  const {
    options: assets,
    knownOptions: knownAssets,
    loading: assetsLoading,
    error: assetsError,
    search: searchAssets,
  } = usePagedPickerOptions<AssetRequestOption>(assetPath, errorsDict.generic, initialAssets);

  useEffect(() => {
    Promise.all([
      apiFetch<MeData>("/auth/me"),
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<RoomOption[]>("/rooms/options"),
      apiFetch<CategoryDto[]>("/assets/categories"),
    ])
      .then(([meData, departmentRows, roomRows, categoryRows]) => {
        setMe(meData);
        setDepartments(departmentRows);
        setRooms(roomRows);
        setCategories(categoryRows);
        // Only as a convenience on a new request: defaulting here would
        // overwrite the department an edited request already has.
        if (!editing && meData.departments.length === 1) setDepartmentId(meData.departments[0]!.id);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : errorsDict.generic);
        setMe((current) => current ?? { departments: [] });
        setDepartments((current) => current ?? []);
        setRooms((current) => current ?? []);
        setCategories((current) => current ?? []);
      })
      .finally(() => setLoading(false));
  }, [editing, errorsDict.generic]);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  const assignedDepartmentIds = useMemo(
    () => new Set(me?.departments.map((department) => department.id) ?? []),
    [me]
  );
  const departmentOptions = useMemo(
    () => (departments ? flattenDepartmentHierarchy(departments, entityLocale).filter(({ item }) => assignedDepartmentIds.has(item.id)) : []),
    [assignedDepartmentIds, departments, entityLocale]
  );
  const excludedDepartmentIds = useMemo(
    () => new Set((departments ?? []).filter((department) => !assignedDepartmentIds.has(department.id)).map((department) => department.id)),
    [assignedDepartmentIds, departments]
  );
  const departmentName = departmentOptions.find(({ item }) => item.id === departmentId)?.path ?? "—";
  const visibleRooms = (rooms ?? []).filter((room) => !departmentId || room.departmentId === departmentId);
  const matchingAssets = (assets ?? []).filter((asset) => !selectedAssetIds.has(asset.id));
  const selectedAssets = [...selectedAssetIds]
    .map((id) => knownAssets[id])
    .filter((asset): asset is AssetRequestOption => !!asset);
  const purchaseLines = Object.entries(categoryQuantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([categoryId, quantity]) => ({ categoryId, assetId: null, quantity }));
  const assetLines = [...selectedAssetIds].map((assetId) => ({ assetId, categoryId: null, quantity: 1 }));
  const hasSelection = purpose === "PURCHASE" ? purchaseLines.length > 0 : assetLines.length > 0;

  function changePurpose(next: AssetRequestPurpose) {
    setPurpose(next);
    setCategoryQuantities({});
    setSelectedAssetIds(new Set());
    if (next !== "TRANSFER") setDestinationRoomId("");
  }

  function chooseAsset(assetId: string) {
    setSelectedAssetIds((current) => new Set([...current, assetId]));
  }

  function removeAsset(assetId: string) {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      next.delete(assetId);
      return next;
    });
  }

  function handleFilesSelected(picked: File[]) {
    if (picked.length) setFiles((current) => [...current, ...picked]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!departmentId || !hasSelection || !reason.trim() || (purpose === "TRANSFER" && !destinationRoomId)) {
      setError(dict.requiredFields);
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiFetch<AssetRequestDetail>(
        editing ? `/asset-requests/${editing.id}` : "/asset-requests",
        {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          departmentId,
          roomId: roomId || null,
          purpose,
          priority,
          destinationRoomId: purpose === "TRANSFER" ? destinationRoomId : null,
          reason: reason.trim(),
          lines: purpose === "PURCHASE" ? purchaseLines : assetLines,
        }),
        }
      );

      let uploadFailed = false;
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          await apiUpload<AttachmentDto>(`/attachments?ownerType=ASSET_REQUEST&ownerId=${created.id}`, formData);
        } catch {
          uploadFailed = true;
        }
      }
      if (uploadFailed) window.alert(dict.attachmentsFailed);
      onSubmitted(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (loading) return <SectionLoading />;
  if (!me || !departments || !rooms || !categories) {
    return <p className="form-error" role="alert">{error ?? errorsDict.generic}</p>;
  }

  return (
    <form id={formId} className="legacy-asset-request-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid asset-request-context-grid">
        <div className={departmentOptions.length === 1 ? "readonly-box" : "field"}>
          <label className={departmentOptions.length === 1 ? "readonly-box-label" : undefined}>
            {dict.departmentLabel} <span className="required-mark">*</span>
          </label>
          {departmentOptions.length === 1 ? (
            <span className="readonly-box-value">{departmentName}</span>
          ) : (
            <DepartmentHierarchyPicker
              departments={departments}
              selectedIds={departmentId ? new Set([departmentId]) : new Set()}
              onChange={(ids) => {
                setDepartmentId(ids.values().next().value ?? "");
                setRoomId("");
                setDestinationRoomId("");
                setSelectedAssetIds(new Set());
              }}
              locale={entityLocale}
              multiple={false}
              excludedIds={excludedDepartmentIds}
            />
          )}
        </div>
        <div className="field">
          <label>{dict.roomLabel}</label>
          <select
            value={roomId}
            disabled={!departmentId}
            onChange={(event) => {
              setRoomId(event.target.value);
              setSelectedAssetIds(new Set());
            }}
          >
            <option value="">—</option>
            {visibleRooms.map((room) => (
              <option key={room.id} value={room.id}>{room.roomNumber} — {room.nameAr}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{dict.priorityLabel}</label>
          <select value={priority} onChange={(event) => setPriority(event.target.value as "NORMAL" | "URGENT")}>
            <option value="NORMAL">{dict.priorityNormal}</option>
            <option value="URGENT">{dict.priorityUrgent}</option>
          </select>
        </div>
      </div>

      <label className="asset-request-purpose-label">{dict.purposeLabel}</label>
      <div className="pill-select asset-request-purpose-tabs" role="tablist">
        {([
          ["PURCHASE", "🛒", dict.purposePurchase],
          ["MAINTENANCE", "🔧", dict.purposeMaintenance],
          ["TRANSFER", "▣", dict.purposeTransfer],
        ] as const).map(([value, icon, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={purpose === value}
            className={`pill-opt ${purpose === value ? "checked" : ""}`}
            onClick={() => changePurpose(value)}
          >
            <span aria-hidden="true">{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>

      {purpose === "TRANSFER" && (
        <div className="field asset-request-destination">
          <label>{dict.destinationRoomLabel} <span className="required-mark">*</span></label>
          <select value={destinationRoomId} onChange={(event) => setDestinationRoomId(event.target.value)} required>
            <option value="">—</option>
            {rooms.filter((room) => room.id !== roomId).map((room) => (
              <option key={room.id} value={room.id}>
                {room.roomNumber} — {room.nameAr}{room.departmentNameAr ? ` — ${room.departmentNameAr}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <h4 className="ps-section-title asset-request-selection-title">
        {purpose === "PURCHASE" ? dict.pickCategories : purpose === "TRANSFER" ? dict.pickTransferAssets : dict.pickAssets}
      </h4>

      {purpose === "PURCHASE" ? (
        <div className="asset-category-quantity-list">
          {categories.map((category) => (
            <div key={category.id} className="asset-category-quantity-row">
              <span>{category.icon && <b aria-hidden="true">{category.icon}</b>} {entityName(category, entityLocale)}</span>
              <label>
                <input
                  aria-label={`${dict.quantityLabel}: ${entityName(category, entityLocale)}`}
                  type="number"
                  min={0}
                  value={categoryQuantities[category.id] ?? 0}
                  onChange={(event) => setCategoryQuantities((current) => ({
                    ...current,
                    [category.id]: Math.max(0, Number(event.target.value) || 0),
                  }))}
                />
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="asset-autocomplete">
          {selectedAssets.length > 0 && (
            <div className="asset-autocomplete-selected">
              {selectedAssets.map((asset) => (
                <button key={asset.id} type="button" className="department-chip" onClick={() => removeAsset(asset.id)}>
                  <span>{asset.assetNumber} — {entityName(asset, entityLocale)}</span><b aria-hidden="true">×</b>
                </button>
              ))}
            </div>
          )}
          <SearchablePicker
            items={matchingAssets}
            value=""
            placeholder={dict.assetSearchPlaceholder}
            ariaLabel={dict.assetSearchPlaceholder}
            emptyLabel={dict.noMatchingAssets}
            loadingLabel="…"
            errorLabel={assetsError}
            clearLabel={`${dict.assetSearchPlaceholder} ×`}
            loading={assetsLoading}
            onSearchChange={searchAssets}
            onChange={(assetId) => chooseAsset(assetId)}
            itemText={(asset) => `${asset.assetNumber} — ${entityName(asset, entityLocale)}`}
            itemSearchText={(asset) => `${asset.assetNumber} ${asset.nameAr} ${asset.nameEn}`}
            renderItem={(asset) => (
              <>
                <b>{entityName(asset, entityLocale)}</b>
                <span>{asset.assetNumber}{asset.category ? ` — ${entityLocale === "ar" ? asset.category.ar : asset.category.en}` : ""}</span>
              </>
            )}
          />
        </div>
      )}

      <div className="field asset-request-description">
        <label>{dict.reasonLabel} <span className="required-mark">*</span></label>
        <textarea className="resize-none" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={dict.descriptionPlaceholder} required />
      </div>

      <div className="field asset-request-attachments">
        <label>{dict.attachmentsHint}</label>
        <PendingAttachmentPicker
          files={files}
          uploadLabel={dict.addAttachment}
          emptyLabel={dict.noAttachments}
          hint={dict.attachmentsHint}
          onSelect={handleFilesSelected}
          onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
          removeLabel={dict.removeAttachment}
        />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!formId && (
        <button type="submit" className="btn btn-primary" disabled={submitting || !hasSelection}>
          {submitting && <span className="spinner" />}{dict.submit}
        </button>
      )}
    </form>
  );
}
