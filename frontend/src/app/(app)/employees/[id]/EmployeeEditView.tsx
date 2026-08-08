"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import EmployeeForm from "@/components/EmployeeForm";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import type { EmployeeDetail, LocalizedEntityDto, PermissionDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function EmployeeEditView({
  id,
  dict,
  errorsDict,
  commonDict,
}: {
  id: string;
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [jobTitles, setJobTitles] = useState<LocalizedEntityDto[] | null>(null);
  const [allPermissions, setAllPermissions] = useState<PermissionDto[] | null>(null);
  const [conflict, setConflict] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function loadAll() {
    Promise.all([
      apiFetch<EmployeeDetail>(`/employees/${id}`),
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<LocalizedEntityDto[]>("/job-titles"),
      apiFetch<PermissionDto[]>("/permissions"),
    ])
      .then(([e, d, j, p]) => {
        setEmployee(e);
        setDepartments(d);
        setJobTitles(j);
        setAllPermissions(p);
      })
      .catch(() => router.replace("/employees"));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, id]);

  async function handleDeactivate() {
    if (!window.confirm(dict.deactivateConfirm)) return;
    await apiFetch<void>(`/employees/${id}/deactivate`, { method: "POST" });
    loadAll();
    setToast(commonDict.actionSuccess);
  }

  async function handleResetPin() {
    const pin = window.prompt(dict.pinLabel);
    if (!pin) return;
    const pinConfirm = window.prompt(dict.pinConfirmLabel);
    if (pinConfirm !== pin) return;
    await apiFetch<void>(`/employees/${id}/pin`, {
      method: "PUT",
      body: JSON.stringify({ pin, pinConfirm }),
    });
    setToast(commonDict.actionSuccess);
  }

  if (!employee || !departments || !jobTitles || !allPermissions) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{employee.name}</h1>
      {conflict && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {dict.conflictNotice}
        </p>
      )}
      <EmployeeForm
        key={employee.version}
        dict={dict}
        errorsDict={errorsDict}
        mode="edit"
        initial={employee}
        departments={departments}
        jobTitles={jobTitles}
        allPermissions={allPermissions}
        onSubmitted={(e) => {
          setEmployee(e);
          setToast(commonDict.actionSuccess);
        }}
        onConflict={() => setConflict(true)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleResetPin}>
          {dict.resetPin}
        </button>
        {employee.active && (
          <button type="button" className="btn btn-seal btn-sm" onClick={handleDeactivate}>
            {dict.deactivate}
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
