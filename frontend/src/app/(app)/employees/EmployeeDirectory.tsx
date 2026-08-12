"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import EmployeeForm from "@/components/EmployeeForm";
import Toast from "@/components/Toast";
import type { EmployeeDetail, EmployeeListItem, LocalizedEntityDto, PagedResponse, PermissionDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import TableSearch from "@/components/TableSearch";

export default function EmployeeDirectory({
  dict,
  errorsDict,
  permissionDict,
  commonDict,
  locale,
}: {
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
  permissionDict: Dictionary["permission"];
  commonDict: Dictionary["common"];
  locale: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState<PagedResponse<EmployeeListItem> | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [jobTitles, setJobTitles] = useState<LocalizedEntityDto[] | null>(null);
  const [allPermissions, setAllPermissions] = useState<PermissionDto[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

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

  function openAddModal() {
    setShowAddModal(true);
    if (!departments || !jobTitles || !allPermissions) {
      Promise.all([
        apiFetch<LocalizedEntityDto[]>("/departments"),
        apiFetch<LocalizedEntityDto[]>("/job-titles"),
        apiFetch<PermissionDto[]>("/permissions"),
      ]).then(([d, j, p]) => {
        setDepartments(d);
        setJobTitles(j);
        setAllPermissions(p);
      });
    }
  }

  function handleAdded(employee: EmployeeDetail) {
    setShowAddModal(false);
    load(0, q);
    setToast(commonDict.actionSuccess);
    void employee;
  }

  if (!page) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>

      <div className="panel">
        <div className="panel-head table-toolbar">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={dict.search} />
          </form>
          {canManage && (
            <div className="table-toolbar-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
                {dict.addNew}
              </button>
            </div>
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

      {showAddModal && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal wide">
            <div className="modal-head">
              <h3>{dict.addNew}</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="close">
                ×
              </button>
            </div>
            <div className="modal-body">
              {!departments || !jobTitles || !allPermissions ? (
                <SectionLoading />
              ) : (
                <EmployeeForm
                  dict={dict}
                  errorsDict={errorsDict}
                  permissionDict={permissionDict}
                  locale={locale}
                  mode="create"
                  departments={departments}
                  jobTitles={jobTitles}
                  allPermissions={allPermissions}
                  onSubmitted={handleAdded}
                  formId="employee-add-form"
                  onSubmittingChange={setAddSubmitting}
                />
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddModal(false)} disabled={addSubmitting}>
                {commonDict.cancel}
              </button>
              <button
                type="submit"
                form="employee-add-form"
                className="btn btn-primary btn-sm"
                disabled={addSubmitting || !departments || !jobTitles || !allPermissions}
              >
                {addSubmitting && <span className="spinner" />}
                {dict.submitCreate}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
