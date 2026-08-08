"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import { exportToXlsx } from "@/lib/exportXlsx";
import PrintReportHeader from "@/components/PrintReportHeader";
import SectionLoading from "@/components/SectionLoading";
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

  if (!page) return <SectionLoading />;

  return (
    <>
      <div className="no-print">
        <div className="eyebrow">{dict.title}</div>
        <h1 className="section-title disp">{dict.title}</h1>
      </div>
      <div className="print-only">
        <PrintReportHeader title={dict.title} dict={commonDict} />
      </div>

      <div className="panel">
        <div className="panel-head no-print" style={{ justifyContent: "flex-end" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
              {commonDict.exportXlsx}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
              {commonDict.print}
            </button>
            {canPost && (
              <Link href={`${basePath}/new`} className="btn btn-primary btn-sm">
                {dict.addNew}
              </Link>
            )}
          </div>
        </div>

        {page.content.length === 0 ? (
          <div className="empty">
            <b>{dict.noResults}</b>
          </div>
        ) : (
          <div className="table-scroll">
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
                    <td className="mono">{invoice.invoiceNumber}</td>
                    <td className="mono">{invoice.invoiceDate}</td>
                    <td>{invoice.vendor}</td>
                    <td className="qty-num">{invoice.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
