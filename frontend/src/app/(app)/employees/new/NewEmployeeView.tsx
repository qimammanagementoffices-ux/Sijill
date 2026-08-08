"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import EmployeeForm from "@/components/EmployeeForm";
import SectionLoading from "@/components/SectionLoading";
import type { EmployeeDetail, LocalizedEntityDto, PermissionDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function NewEmployeeView({
  dict,
  errorsDict,
  permissionDict,
  locale,
}: {
  dict: Dictionary["employees"];
  errorsDict: Dictionary["errors"];
  permissionDict: Dictionary["permission"];
  locale: string;
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

  if (!departments || !jobTitles || !allPermissions) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.addNew}</h1>
      <EmployeeForm
        dict={dict}
        errorsDict={errorsDict}
        permissionDict={permissionDict}
        locale={locale}
        mode="create"
        departments={departments}
        jobTitles={jobTitles}
        allPermissions={allPermissions}
        onSubmitted={(employee: EmployeeDetail) => router.push(`/employees/${employee.id}`)}
      />
    </>
  );
}
