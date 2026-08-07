"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import EmployeeForm from "@/components/EmployeeForm";
import type { EmployeeDetail, LocalizedEntityDto, PermissionDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function NewEmployeeView({
  dict,
  errorsDict,
}: {
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
  const [departments, setDepartments] = useState<LocalizedEntityDto[] | null>(null);
  const [jobTitles, setJobTitles] = useState<LocalizedEntityDto[] | null>(null);
  const [allPermissions, setAllPermissions] = useState<PermissionDto[] | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([
      apiFetch<LocalizedEntityDto[]>("/departments"),
      apiFetch<LocalizedEntityDto[]>("/job-titles"),
      apiFetch<PermissionDto[]>("/permissions"),
    ])
      .then(([d, j, p]) => {
        setDepartments(d);
        setJobTitles(j);
        setAllPermissions(p);
      })
      .catch(() => router.replace("/employees"));
  }, [router]);

  if (!departments || !jobTitles || !allPermissions) return null;

  return (
    <main style={{ maxWidth: 600, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.addNew}</h1>
      <EmployeeForm
        dict={dict}
        errorsDict={errorsDict}
        mode="create"
        departments={departments}
        jobTitles={jobTitles}
        allPermissions={allPermissions}
        onSubmitted={(employee: EmployeeDetail) => router.push(`/employees/${employee.id}`)}
      />
    </main>
  );
}
