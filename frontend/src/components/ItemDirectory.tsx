"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import type { InventoryItemListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Shared by /warehouse/items and /maintenance/parts — same reusable
// inventory module on the backend (Domain-parameterized), same shape here.
// basePath is both the page route and the API path since they're
// identical in both domains ("/warehouse/items", "/maintenance/parts").
export default function ItemDirectory({
  dict,
  commonDict,
  basePath,
}: {
  dict: Dictionary["warehouseItems"];
  commonDict: Dictionary["common"];
  basePath: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState<PagedResponse<InventoryItemListItem> | null>(null);
  const [canManage, setCanManage] = useState(false);

  function load(pageNumber: number, query: string, lowStock: boolean) {
    apiFetch<PagedResponse<InventoryItemListItem>>(
      `${basePath}?q=${encodeURIComponent(query)}&lowStockOnly=${lowStock}&page=${pageNumber}`
    )
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load(0, "", false);
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("wh.items")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(0, q, lowStockOnly);
  }

  async function handleExport() {
    const all = await apiFetch<PagedResponse<InventoryItemListItem>>(
      `${basePath}?q=${encodeURIComponent(q)}&lowStockOnly=${lowStockOnly}&size=10000`
    );
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnCode, value: (i: InventoryItemListItem) => i.code },
        { header: dict.columnName, value: (i: InventoryItemListItem) => i.nameAr },
        { header: dict.columnCategory, value: (i: InventoryItemListItem) => i.category?.ar ?? "" },
        { header: dict.columnQuantity, value: (i: InventoryItemListItem) => i.quantity },
        { header: dict.columnMinQuantity, value: (i: InventoryItemListItem) => i.minQuantity },
      ],
      all.content
    );
  }

  if (!page) return null;

  return (
    <main style={{ maxWidth: 900, margin: "5vh auto", padding: "0 1rem" }}>
      <PrintReportHeader title={dict.title} dict={commonDict} />

      <p className="no-print">
        <button type="button" onClick={handleExport}>
          {commonDict.exportXlsx}
        </button>
        <button type="button" onClick={() => window.print()}>
          {commonDict.print}
        </button>
      </p>

      <form className="no-print" onSubmit={handleSearch}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={dict.searchPlaceholder}
        />
        <label>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              load(0, q, e.target.checked);
            }}
          />
          {dict.lowStockOnly}
        </label>
        <button type="submit">{dict.search}</button>
      </form>

      {canManage && (
        <p className="no-print">
          <Link href={`${basePath}/new`}>{dict.addNew}</Link>
        </p>
      )}

      {page.content.length === 0 ? (
        <p>{dict.noResults}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.columnCode}</th>
              <th>{dict.columnName}</th>
              <th>{dict.columnCategory}</th>
              <th>{dict.columnQuantity}</th>
              <th>{dict.columnMinQuantity}</th>
              <th>{dict.columnStatus}</th>
            </tr>
          </thead>
          <tbody>
            {page.content.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`${basePath}/${item.id}`}>{item.code}</Link>
                </td>
                <td>{item.nameAr}</td>
                <td>{item.category ? item.category.ar : ""}</td>
                <td>{item.quantity}</td>
                <td>{item.minQuantity}</td>
                <td>{item.lowStock ? dict.lowStockBadge : dict.okBadge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {page.totalPages > 1 && (
        <p className="no-print">
          {Array.from({ length: page.totalPages }, (_, i) => i).map((i) => (
            <button key={i} type="button" onClick={() => load(i, q, lowStockOnly)} disabled={i === page.page}>
              {i + 1}
            </button>
          ))}
        </p>
      )}
    </main>
  );
}
