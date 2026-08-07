"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import ItemForm from "@/components/ItemForm";
import AttachmentUploader from "@/components/AttachmentUploader";
import type { CategoryDto, InventoryItemDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function ItemEditView({
  id,
  dict,
  attachmentsDict,
  errorsDict,
  itemBasePath,
  categoriesPath,
}: {
  id: string;
  dict: Dictionary["warehouseItems"];
  attachmentsDict: Dictionary["attachments"];
  errorsDict: Dictionary["errors"];
  itemBasePath: string;
  categoriesPath: string;
}) {
  const router = useRouter();
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [canManage, setCanManage] = useState(false);

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
  }

  if (!item || !categories) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>
        {item.nameAr} ({item.code})
      </h1>
      <ItemForm
        key={item.version}
        dict={dict}
        errorsDict={errorsDict}
        mode="edit"
        initial={item}
        categories={categories}
        basePath={itemBasePath}
        onSubmitted={setItem}
      />
      {item.active && (
        <button type="button" onClick={handleDeactivate}>
          {dict.deactivate}
        </button>
      )}
      <AttachmentUploader ownerType="INVENTORY_ITEM" ownerId={item.id} dict={attachmentsDict} canManage={canManage} />
    </main>
  );
}
