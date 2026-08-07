"use client";

import type { PermissionDto } from "@/lib/types";

// Groups the flat permission catalogue by its dot-prefix (emp./wh./mt./as./sys.)
// for a readable checkbox grid, per master spec §4's permission key catalogue.
export default function PermissionGrid({
  allPermissions,
  selected,
  onChange,
}: {
  allPermissions: PermissionDto[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
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

  return (
    <div>
      {Array.from(groups.entries()).map(([prefix, permissions]) => (
        <fieldset key={prefix}>
          <legend>{prefix}</legend>
          {permissions.map((permission) => (
            <label key={permission.key} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={selected.has(permission.key)}
                onChange={() => toggle(permission.key)}
              />
              {permission.key} — {permission.description}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
