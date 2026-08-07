"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import type { InvoiceDetail, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Shared by /warehouse/invoices and /maintenance/invoices.
export default function InvoiceList({
  dict,
  commonDict,
  basePath,
}: {
  dict: Dictionary["warehouseInvoices"];
  commonDict: Dictionary["common"];
  basePath: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState<PagedResponse<InvoiceDetail> | null>(null);
  const [canPost, setCanPost] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<PagedResponse<InvoiceDetail>>(basePath)
      .then(setPage)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      });
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanPost(me.permissions.includes("wh.invoices.edit")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleExport() {
    const all = await apiFetch<PagedResponse<InvoiceDetail>>(`${basePath}?size=10000`);
    await exportToXlsx(
      dict.title,
      dict.title,
      [
        { header: dict.columnNumber, value: (i: InvoiceDetail) => i.invoiceNumber },
        { header: dict.columnDate, value: (i: InvoiceDetail) => i.invoiceDate },
        { header: dict.columnVendor, value: (i: InvoiceDetail) => i.vendor },
        { header: dict.subtotalLabel, value: (i: InvoiceDetail) => i.subtotal },
        { header: dict.taxTotalLabel, value: (i: InvoiceDetail) => i.taxTotal },
        { header: dict.columnTotal, value: (i: InvoiceDetail) => i.total },
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

      {canPost && (
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
              <th>{dict.columnNumber}</th>
              <th>{dict.columnDate}</th>
              <th>{dict.columnVendor}</th>
              <th>{dict.columnTotal}</th>
            </tr>
          </thead>
          <tbody>
            {page.content.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.invoiceDate}</td>
                <td>{invoice.vendor}</td>
                <td>{invoice.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
