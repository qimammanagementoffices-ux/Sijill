"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import PermissionGrid from "@/components/PermissionGrid";
import type {
  EmployeeDetail,
  LocalizedEntityDto,
  PermissionDto,
} from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

type Props = {
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
  mode: "create" | "edit";
  initial?: EmployeeDetail;
  departments: LocalizedEntityDto[];
  jobTitles: LocalizedEntityDto[];
  allPermissions: PermissionDto[];
  onSubmitted: (employee: EmployeeDetail) => void;
  onConflict?: () => void;
};

export default function EmployeeForm({
  dict,
  errorsDict,
  mode,
  initial,
  departments,
  jobTitles,
  allPermissions,
  onSubmitted,
  onConflict,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? "");
  const [joinedDate, setJoinedDate] = useState(initial?.joinedDate ?? "");
  const [jobTitleId, setJobTitleId] = useState(initial?.jobTitle?.id ?? "");
  const [departmentIds, setDepartmentIds] = useState<Set<string>>(
    new Set(initial?.departments.map((d) => d.id) ?? [])
  );
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(
    new Set(initial?.permissions ?? [])
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleDepartment(id: string) {
    const next = new Set(departmentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDepartmentIds(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await apiFetch<EmployeeDetail>("/employees", {
          method: "POST",
          body: JSON.stringify({
            name,
            phone,
            pin,
            pinConfirm,
            email: email || null,
            nationalId: nationalId || null,
            joinedDate: joinedDate || null,
            jobTitleId: jobTitleId || null,
            departmentIds: Array.from(departmentIds),
            permissionKeys: Array.from(permissionKeys),
          }),
        });
        onSubmitted(created);
      } else if (initial) {
        const updated = await apiFetch<EmployeeDetail>(`/employees/${initial.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            phone,
            email: email || null,
            nationalId: nationalId || null,
            jobTitleId: jobTitleId || null,
            departmentIds: Array.from(departmentIds),
            version: initial.version,
          }),
        });

        const permissionsChanged =
          permissionKeys.size !== new Set(initial.permissions).size ||
          Array.from(permissionKeys).some((k) => !initial.permissions.includes(k));

        if (permissionsChanged) {
          const withPermissions = await apiFetch<EmployeeDetail>(
            `/employees/${initial.id}/permissions`,
            {
              method: "PUT",
              body: JSON.stringify({
                permissionKeys: Array.from(permissionKeys),
                version: updated.version,
              }),
            }
          );
          onSubmitted(withPermissions);
        } else {
          onSubmitted(updated);
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && onConflict) {
        onConflict();
      } else {
        setError(err instanceof ApiError ? err.message : errorsDict.generic);
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {dict.nameLabel}
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        {dict.phoneLabel}
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
      {mode === "create" && (
        <>
          <label>
            {dict.pinLabel}
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </label>
          <label>
            {dict.pinConfirmLabel}
            <input
              type="password"
              inputMode="numeric"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              required
            />
          </label>
        </>
      )}
      <label>
        {dict.emailLabel}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        {dict.nationalIdLabel}
        <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
      </label>
      {mode === "create" && (
        <label>
          {dict.joinedDateLabel}
          <input type="date" value={joinedDate} onChange={(e) => setJoinedDate(e.target.value)} />
        </label>
      )}
      <label>
        {dict.jobTitleLabel}
        <select value={jobTitleId} onChange={(e) => setJobTitleId(e.target.value)}>
          <option value="">—</option>
          {jobTitles.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.nameAr} / {jt.nameEn}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{dict.departmentsLabel}</legend>
        {departments.map((d) => (
          <label key={d.id} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={departmentIds.has(d.id)}
              onChange={() => toggleDepartment(d.id)}
            />
            {d.nameAr} / {d.nameEn}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{dict.permissionsLabel}</legend>
        <PermissionGrid
          allPermissions={allPermissions}
          selected={permissionKeys}
          onChange={setPermissionKeys}
        />
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {mode === "create" ? dict.submitCreate : dict.submitUpdate}
      </button>
    </form>
  );
}
