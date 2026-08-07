"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { AssetListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function AssetDirectory({ dict }: { dict: Dictionary["assets"] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState<PagedResponse<AssetListItem> | null>(null);
  const [canManage, setCanManage] = useState(false);

  function load(pageNumber: number, query: string) {
    apiFetch<PagedResponse<AssetListItem>>(`/assets?q=${encodeURIComponent(query)}&page=${pageNumber}`)
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
    load(0, "");
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("as.manage")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(0, q);
  }

  function statusLabel(status: string) {
    return {
      ACTIVE: dict.statusActive,
      MAINTENANCE: dict.statusMaintenance,
      RETIRED: dict.statusRetired,
    }[status];
  }

  if (!page) return null;

  return (
    <main style={{ maxWidth: 900, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>

      <form onSubmit={handleSearch}>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit">{dict.title}</button>
      </form>

      {canManage && (
        <p>
          <Link href="/assets/new">{dict.addNew}</Link>
        </p>
      )}
      <p>
        <Link href="/assets/custody-report">{dict.custodyReportTitle}</Link>
      </p>

      {page.content.length === 0 ? (
        <p>{dict.noResults}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.columnAssetNumber}</th>
              <th>{dict.columnName}</th>
              <th>{dict.columnCategory}</th>
              <th>{dict.columnRoom}</th>
              <th>{dict.columnCustodian}</th>
              <th>{dict.columnStatus}</th>
            </tr>
          </thead>
          <tbody>
            {page.content.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <Link href={`/assets/${asset.id}`}>{asset.assetNumber}</Link>
                </td>
                <td>{asset.nameAr}</td>
                <td>{asset.category ? asset.category.ar : ""}</td>
                <td>{asset.room ? asset.room.ar : ""}</td>
                <td>{asset.custodianName ?? ""}</td>
                <td>{statusLabel(asset.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {page.totalPages > 1 && (
        <p>
          {Array.from({ length: page.totalPages }, (_, i) => i).map((i) => (
            <button key={i} type="button" onClick={() => load(i, q)} disabled={i === page.page}>
              {i + 1}
            </button>
          ))}
        </p>
      )}
    </main>
  );
}
