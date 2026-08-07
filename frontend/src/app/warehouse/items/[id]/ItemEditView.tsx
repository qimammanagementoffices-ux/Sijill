"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import ItemForm from "@/components/ItemForm";
import type { CategoryDto, InventoryItemDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function ItemEditView({
  id,
  dict,
  errorsDict,
}: {
  id: string;
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);

  function load() {
    Promise.all([
      apiFetch<InventoryItemDetail>(`/warehouse/items/${id}`),
      apiFetch<CategoryDto[]>("/warehouse/categories"),
    ])
      .then(([i, c]) => {
        setItem(i);
        setCategories(c);
      })
      .catch(() => router.replace("/warehouse/items"));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, id]);

  async function handleDeactivate() {
    await apiFetch<void>(`/warehouse/items/${id}/deactivate`, { method: "POST" });
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
        onSubmitted={setItem}
      />
      {item.active && (
        <button type="button" onClick={handleDeactivate}>
          {dict.deactivate}
        </button>
      )}
    </main>
  );
}
