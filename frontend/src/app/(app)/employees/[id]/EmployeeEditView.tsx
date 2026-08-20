"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import EmployeeForm from "@/components/EmployeeForm";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";
import type { EmployeeDetail, LocalizedEntityDto, PermissionDto } from "@/lib/types";
import PinPromptDialog from "@/components/PinPromptDialog";
import type { Dictionary } from "@/i18n/getDictionary";

export default function EmployeeEditView({
  id,
  dict,
  errorsDict,
  commonDict,
  permissionDict,
  locale,
}: {
  id: string;
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
  commonDict: Dictionary["common"];
  permissionDict: Dictionary["permission"];
  locale: string;
}) {
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [jobTitles, setJobTitles] = useState<LocalizedEntityDto[] | null>(null);
  const [allPermissions, setAllPermissions] = useState<PermissionDto[] | null>(null);
  const [conflict, setConflict] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);

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

  async function handleReactivate() {
    if (!window.confirm(dict.reactivateConfirm)) return;
    await apiFetch<void>(`/employees/${id}/reactivate`, { method: "POST" });
    loadAll();
    setToast(commonDict.actionSuccess);
  }

  async function handleResetPin(pin: string, pinConfirm: string) {
    await apiFetch<void>(`/employees/${id}/pin`, {
      method: "PUT",
      body: JSON.stringify({ pin, pinConfirm }),
    });
    setPinPromptOpen(false);
    setToast(commonDict.actionSuccess);
  }

  if (!employee || !departments || !jobTitles || !allPermissions) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        {employee.photoUrl ? (
          <img
            src={employee.photoUrl}
            alt=""
            style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flex: "none" }}
          />
        ) : (
          <div
            className="brand-seal"
            style={{ background: "var(--ink)", color: "#fff", width: 48, height: 48, fontSize: 20, margin: 0 }}
          >
            {employee.name.trim().charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <h1 className="section-title disp" style={{ margin: 0 }}>
          {employee.name}
        </h1>
      </div>
      {conflict && (
        <p role="alert" className="form-error form-error-block">
          {dict.conflictNotice}
        </p>
      )}
      <EmployeeForm
        key={employee.version}
        dict={dict}
        errorsDict={errorsDict}
        permissionDict={permissionDict}
        locale={locale}
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
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setPinPromptOpen(true)}>
          {dict.resetPin}
        </button>
        {employee.active && (
          <button type="button" className="btn btn-seal btn-sm" onClick={handleDeactivate}>
            {dict.deactivate}
          </button>
        )}
        {!employee.active && (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleReactivate}>
            {dict.reactivate}
          </button>
        )}
      </div>

      {pinPromptOpen && (
        <PinPromptDialog
          title={dict.resetPin}
          pinLabel={dict.pinLabel}
          pinConfirmLabel={dict.pinConfirmLabel}
          submitLabel={commonDict.save}
          cancelLabel={commonDict.cancel}
          mismatchMessage={errorsDict.generic}
          onSubmit={handleResetPin}
          onCancel={() => setPinPromptOpen(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
