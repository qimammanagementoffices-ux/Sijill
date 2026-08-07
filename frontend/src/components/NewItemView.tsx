"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import ItemForm from "@/components/ItemForm";
import type { CategoryDto, InventoryItemDetail } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function NewItemView({
  dict,
  errorsDict,
  itemBasePath,
  categoriesPath,
}: {
  dict: Dictionary["warehouseItems"];
  errorsDict: Dictionary["errors"];
  itemBasePath: string;
  categoriesPath: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<CategoryDto[]>(categoriesPath)
      .then(setCategories)
      .catch(() => router.replace(itemBasePath));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!categories) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.addNew}</h1>
      <ItemForm
        dict={dict}
        errorsDict={errorsDict}
        mode="create"
        categories={categories}
        basePath={itemBasePath}
        onSubmitted={(item: InventoryItemDetail) => router.push(`${itemBasePath}/${item.id}`)}
      />
    </main>
  );
}
