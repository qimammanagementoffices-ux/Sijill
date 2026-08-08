"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { PermissionDto, PermissionOverviewDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import { IconUsers, IconBox, IconWrench, IconBuilding, IconGear } from "@/components/NavIcons";

const GROUP_ICON: Record<string, (props: { className?: string }) => JSX.Element> = {
  emp: IconUsers,
  wh: IconBox,
  mt: IconWrench,
  as: IconBuilding,
  sys: IconGear,
};

export default function PermissionsOverviewView({
  dict,
  permissionDict,
}: {
  dict: Dictionary["permissionsOverview"];
  permissionDict: Dictionary["permission"];
}) {
  const router = useRouter();
  const [permissions, setPermissions] = useState<PermissionDto[] | null>(null);
  const [counts, setCounts] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([apiFetch<PermissionDto[]>("/permissions"), apiFetch<PermissionOverviewDto[]>("/permissions/overview")])
      .then(([perms, overview]) => {
        setPermissions(perms);
        setCounts(new Map(overview.map((o) => [o.key, o.employeeCount])));
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!permissions || !counts) return <SectionLoading />;

  const groups = new Map<string, PermissionDto[]>();
  for (const permission of permissions) {
    const prefix = permission.key.split(".")[0] ?? permission.key;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(permission);
  }

  function label(key: string) {
    return permissionDict[key.replace(/\./g, "_")] ?? key;
  }

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>

      <div className="panel">
        <div className="panel-body">
          {Array.from(groups.entries()).map(([prefix, perms]) => {
            const Icon = GROUP_ICON[prefix];
            return (
              <div key={prefix} className="perm-group">
                <div className="perm-group-head">
                  {Icon && <Icon className="ic" />}
                  {permissionDict[`group_${prefix}`] ?? prefix}
                </div>
                <div className="preset-row" style={{ marginBottom: 20 }}>
                  {perms.map((p) => (
                    <span key={p.key} className="chip">
                      {label(p.key)} · {counts.get(p.key) ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
