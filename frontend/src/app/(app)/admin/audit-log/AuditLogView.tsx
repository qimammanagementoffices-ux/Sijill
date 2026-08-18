"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { AuditLogDto, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import TableFooter from "@/components/TableFooter";

export default function AuditLogView({
  dict,
  commonDict,
}: {
  dict: Dictionary["auditLog"];
  commonDict: Dictionary["common"];
}) {
  const [page, setPage] = useState<PagedResponse<AuditLogDto> | null>(null);
  const [size, setSize] = useState(20);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);

  function load(pageNumber: number, pageSize = size) {
    setLoadingPage(pageNumber);
    apiFetch<PagedResponse<AuditLogDto>>(`/audit-logs?page=${pageNumber}&size=${pageSize}`)
      .then(setPage)
      .finally(() => setLoadingPage(null));
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!page) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>
      <div className="panel">
        {page.content.length === 0 ? <div className="empty"><b>{dict.noResults}</b></div> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>{dict.changedAt}</th><th>{dict.actor}</th><th>{dict.action}</th><th>{dict.entity}</th><th>{dict.before}</th><th>{dict.after}</th></tr></thead>
              <tbody>{page.content.map((entry) => (
                <tr key={entry.id}>
                  <td className="mono">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.actorName ?? "—"}</td>
                  <td className="mono">{entry.action}</td>
                  <td className="mono">{entry.entityType}{entry.entityId ? ` · ${entry.entityId}` : ""}</td>
                  <td className="mono">{entry.beforeState ?? "—"}</td>
                  <td className="mono">{entry.afterState ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <TableFooter page={page.page} totalPages={page.totalPages} size={size} loadingPage={loadingPage} rowsPerPageLabel={commonDict.rowsPerPage} onPage={load} onSize={(next) => { setSize(next); load(0, next); }} />
      </div>
    </>
  );
}
