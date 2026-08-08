"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { EmployeeListItem, PagedResponse } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function EmployeeDirectory({ dict }: { dict: Dictionary["employees"] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState<PagedResponse<EmployeeListItem> | null>(null);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load(0, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function load(pageNumber: number, query: string) {
    try {
      const result = await apiFetch<PagedResponse<EmployeeListItem>>(
        `/employees?q=${encodeURIComponent(query)}&page=${pageNumber}`
      );
      setPage(result);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace("/dashboard");
      }
    }
  }

  useEffect(() => {
    apiFetch<{ permissions: string[] }>("/auth/me")
      .then((me) => setCanManage(me.permissions.includes("emp.manage")))
      .catch(() => {});
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(0, q);
  }

  if (!page) return null;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>

      <div className="panel">
        <div className="panel-head">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={dict.searchPlaceholder}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 280 }}
            />
            <button type="submit" className="btn btn-outline btn-sm">
              {dict.search}
            </button>
          </form>
          {canManage && (
            <Link href="/employees/new" className="btn btn-primary btn-sm">
              {dict.addNew}
            </Link>
          )}
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
                  <th>{dict.columnEmployeeNumber}</th>
                  <th>{dict.columnName}</th>
                  <th>{dict.columnPhone}</th>
                  <th>{dict.columnJobTitle}</th>
                  <th>{dict.columnDepartments}</th>
                  <th>{dict.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((employee) => (
                  <tr key={employee.id} className="clickable" onClick={() => router.push(`/employees/${employee.id}`)}>
                    <td className="mono">
                      <Link href={`/employees/${employee.id}`}>{employee.employeeNumber}</Link>
                    </td>
                    <td>{employee.name}</td>
                    <td className="mono">{employee.phone}</td>
                    <td>{employee.jobTitle ? employee.jobTitle.ar : ""}</td>
                    <td>{employee.departments.map((d) => d.ar).join(", ")}</td>
                    <td>
                      <span className={`chip ${employee.active ? "s-approved" : "s-postponed"}`}>
                        <span className="chip-dot" />
                        {employee.active ? dict.active : dict.inactive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {page.totalPages > 1 && (
          <div className="panel-note" style={{ display: "flex", gap: 6, paddingTop: 14 }}>
            {Array.from({ length: page.totalPages }, (_, i) => i).map((i) => (
              <button
                key={i}
                type="button"
                className={`btn btn-sm ${i === page.page ? "btn-primary" : "btn-outline"}`}
                onClick={() => load(i, q)}
                disabled={i === page.page}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
