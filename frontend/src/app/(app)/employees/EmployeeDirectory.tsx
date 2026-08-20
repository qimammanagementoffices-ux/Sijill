"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { usePermissions } from "@/lib/session";
import { getToken } from "@/lib/auth";
import EmployeeForm from "@/components/EmployeeForm";
import Toast from "@/components/Toast";
import type { EmployeeDetail, EmployeeListItem, LocalizedEntityDto, PagedResponse, PermissionDto } from "@/lib/types";
import { withCount } from "@/lib/withCount";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import TableSearch from "@/components/TableSearch";
import { flattenDepartmentHierarchy } from "@/components/DepartmentHierarchyPicker";

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
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState<PagedResponse<EmployeeListItem> | null>(null);
  // From AppShell's /auth/me, not a second call of our own.
  const canManage = usePermissions().includes("emp.manage");
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
    load(0, "", "");
    apiFetch<LocalizedEntityDto[]>("/departments").then(setDepartments).catch(() => setDepartments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function load(pageNumber: number, query: string, departmentId = departmentFilter) {
    try {
      const params = new URLSearchParams({ q: query, page: String(pageNumber) });
      if (departmentId) params.set("departmentId", departmentId);
      const result = await apiFetch<PagedResponse<EmployeeListItem>>(
        `/employees?${params.toString()}`
      );
      setPage(result);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace("/dashboard");
      }
    }
  }

  useEffect(() => {
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(0, q);
  }

  function applyDepartmentFilter(departmentId: string) {
    setDepartmentFilter(departmentId);
    load(0, q, departmentId);
  }

  function openAddModal() {
    setShowAddModal(true);
    if (!jobTitles || !allPermissions) {
      Promise.all([
        apiFetch<LocalizedEntityDto[]>("/job-titles"),
        apiFetch<PermissionDto[]>("/permissions"),
      ]).then(([j, p]) => {
        setJobTitles(j);
        setAllPermissions(p);
      });
    }
  }

  function handleAdded(employee: EmployeeDetail) {
    setShowAddModal(false);
    load(0, q, departmentFilter);
    setToast(commonDict.actionSuccess);
    void employee;
  }

  if (!page) return <SectionLoading />;

  const departmentOptions = flattenDepartmentHierarchy(departments ?? [], locale);
  const departmentPathById = new Map(departmentOptions.map(({ item, path }) => [item.id, path.replaceAll(" / ", "/")]));

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{withCount(dict.title, page)}</h1>

      <div className="panel">
        <div className="panel-head table-toolbar">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <TableSearch value={q} onChange={setQ} placeholder={dict.searchPlaceholder} label={dict.search} />
            <select
              value={departmentFilter}
              onChange={(e) => applyDepartmentFilter(e.target.value)}
            >
              <option value="">{dict.filterAllDepartments || dict.columnDepartments}</option>
              {departmentOptions.map(({ item, path }) => (
                <option key={item.id} value={item.id}>{path.replaceAll(" / ", "/")}</option>
              ))}
            </select>
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
                    <td>
                      <div className="employee-department-chips">
                        {employee.departments.map((department) => {
                          const path = departmentPathById.get(department.id) ?? (locale === "ar" ? department.ar : department.en);
                          const label = locale === "ar" ? department.ar : department.en;
                          return <span key={department.id} className="employee-department-chip" title={path}>{label}</span>;
                        })}
                      </div>
                    </td>
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
                onClick={() => load(i, q, departmentFilter)}
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
