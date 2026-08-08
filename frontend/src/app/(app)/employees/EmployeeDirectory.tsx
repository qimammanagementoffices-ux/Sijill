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
    <main style={{ maxWidth: 900, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={dict.searchPlaceholder}
        />
        <button type="submit">{dict.search}</button>
      </form>

      {canManage && (
        <p>
          <Link href="/employees/new">{dict.addNew}</Link>
        </p>
      )}

      {page.content.length === 0 ? (
        <p>{dict.noResults}</p>
      ) : (
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
              <tr key={employee.id}>
                <td>
                  <Link href={`/employees/${employee.id}`}>{employee.employeeNumber}</Link>
                </td>
                <td>{employee.name}</td>
                <td>{employee.phone}</td>
                <td>{employee.jobTitle ? employee.jobTitle.ar : ""}</td>
                <td>{employee.departments.map((d) => d.ar).join(", ")}</td>
                <td>{employee.active ? dict.active : dict.inactive}</td>
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
