"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import ItemForm from "@/components/ItemForm";
import AttachmentUploader from "@/components/AttachmentUploader";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import type { CategoryDto, InventoryItemDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function ItemEditView({
  id,
  dict,
  attachmentsDict,
  errorsDict,
  commonDict,
  itemBasePath,
  categoriesPath,
}: {
  id: string;
  dict: Dictionary["warehouseItems"];
  attachmentsDict: Dictionary["attachments"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  itemBasePath: string;
  categoriesPath: string;
}) {
  const router = useRouter();
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    Promise.all([
      apiFetch<InventoryItemDetail>(`${itemBasePath}/${id}`),
      apiFetch<CategoryDto[]>(categoriesPath),
    ])
      .then(([i, c]) => {
        setItem(i);
        setCategories(c);
      })
      .catch(() => router.replace(itemBasePath));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("wh.items")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, id]);

  async function handleDeactivate() {
    await apiFetch<void>(`${itemBasePath}/${id}/deactivate`, { method: "POST" });
    load();
    setToast(commonDict.actionSuccess);
  }

  if (!item || !categories) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">
        {item.nameAr} <span className="mono" style={{ fontSize: 16, color: "var(--slate)" }}>({item.code})</span>
      </h1>
      <ItemForm
        key={item.version}
        dict={dict}
        errorsDict={errorsDict}
        mode="edit"
        initial={item}
        categories={categories}
        basePath={itemBasePath}
        onSubmitted={(i) => {
          setItem(i);
          setToast(commonDict.actionSuccess);
        }}
      />
      {item.active && (
        <button type="button" className="btn btn-seal btn-sm" style={{ marginTop: 10 }} onClick={handleDeactivate}>
          {dict.deactivate}
        </button>
      )}
      <div className="panel">
        <AttachmentUploader
          ownerType="INVENTORY_ITEM"
          ownerId={item.id}
          dict={attachmentsDict}
          canManage={canManage}
          onAction={() => setToast(commonDict.actionSuccess)}
        />
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
