"use client";

import type { PermissionDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import { IconUsers, IconBox, IconWrench, IconBuilding, IconGear } from "@/components/NavIcons";

const GROUP_ICON: Record<string, (props: { className?: string }) => JSX.Element> = {
  emp: IconUsers,
  wh: IconBox,
  mt: IconWrench,
  as: IconBuilding,
  sys: IconGear,
};

// Groups the flat permission catalogue by its dot-prefix (emp./wh./mt./as./sys.)
// for a readable checkbox grid, per master spec §4's permission key catalogue.
// Two-tier layout matches the reference site: each prefix group splits into
// "Pages & dashboards" (view/manage/request-type keys) and "Approval
// actions" (.act.* keys).
export default function PermissionGrid({
  allPermissions,
  selected,
  onChange,
  permissionDict,
}: {
  allPermissions: PermissionDto[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  permissionDict: Dictionary["permission"];
}) {
  const groups = new Map<string, PermissionDto[]>();
  for (const permission of allPermissions) {
    const prefix = permission.key.split(".")[0] ?? permission.key;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(permission);
  }

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  }

  function label(key: string) {
    return permissionDict[key.replace(/\./g, "_")] ?? key;
  }

  function row(permission: PermissionDto) {
    return (
      <div key={permission.key} className="perm-row">
        <span>{label(permission.key)}</span>
        <label className="switch">
          <input type="checkbox" checked={selected.has(permission.key)} onChange={() => toggle(permission.key)} />
          <span className="track" />
          <span className="knob" />
        </label>
      </div>
    );
  }

  return (
    <div>
      {Array.from(groups.entries()).map(([prefix, permissions]) => {
        const pages = permissions.filter((p) => !p.key.includes(".act."));
        const actions = permissions.filter((p) => p.key.includes(".act."));
        const Icon = GROUP_ICON[prefix];
        return (
          <div key={prefix} className="perm-group">
            <div className="perm-group-head">
              {Icon && <Icon className="ic" />}
              {permissionDict[`group_${prefix}`] ?? prefix}
            </div>
            <div className="perm-list">
              {pages.length > 0 && (
                <>
                  <div className="perm-sub">{permissionDict.subPages}</div>
                  {pages.map(row)}
                </>
              )}
              {actions.length > 0 && (
                <>
                  <div className="perm-sub">{permissionDict.subActions}</div>
                  {actions.map(row)}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
