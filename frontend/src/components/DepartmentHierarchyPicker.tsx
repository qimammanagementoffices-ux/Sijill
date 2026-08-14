"use client";

import { useMemo, useState } from "react";
import type { LocalizedEntityDto } from "@/lib/types";

export type DepartmentTreeRow = {
  item: LocalizedEntityDto;
  depth: number;
  path: string;
};

function entityName(item: LocalizedEntityDto, locale: string) {
  if (locale === "hi") return item.nameHi || item.nameEn || item.nameAr;
  return locale === "ar" ? item.nameAr : item.nameEn;
}

export function flattenDepartmentHierarchy(items: LocalizedEntityDto[], locale: string): DepartmentTreeRow[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const children = new Map<string | null, LocalizedEntityDto[]>();
  for (const item of items) {
    const parentId = item.parentId && byId.has(item.parentId) ? item.parentId : null;
    children.set(parentId, [...(children.get(parentId) ?? []), item]);
  }
  const compare = (a: LocalizedEntityDto, b: LocalizedEntityDto) =>
    entityName(a, locale).localeCompare(entityName(b, locale), locale);
  children.forEach((group) => group.sort(compare));

  const rows: DepartmentTreeRow[] = [];
  const visited = new Set<string>();
  const walk = (item: LocalizedEntityDto, depth: number, parentPath: string) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    const name = entityName(item, locale);
    const path = parentPath ? `${parentPath} / ${name}` : name;
    rows.push({ item, depth, path });
    for (const child of children.get(item.id) ?? []) walk(child, depth + 1, path);
  };
  for (const root of children.get(null) ?? []) walk(root, 0, "");
  for (const item of [...items].sort(compare)) walk(item, 0, "");
  return rows;
}

export function departmentDescendantIds(items: LocalizedEntityDto[], departmentId: string) {
  const children = new Map<string, string[]>();
  for (const item of items) {
    if (item.parentId) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item.id]);
  }
  const result = new Set<string>([departmentId]);
  const pending = [departmentId];
  while (pending.length) {
    const current = pending.pop()!;
    for (const child of children.get(current) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        pending.push(child);
      }
    }
  }
  return result;
}

export default function DepartmentHierarchyPicker({
  departments,
  selectedIds,
  onChange,
  locale,
  multiple = true,
  excludedIds = new Set<string>(),
}: {
  departments: LocalizedEntityDto[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  locale: string;
  multiple?: boolean;
  excludedIds?: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => flattenDepartmentHierarchy(departments, locale), [departments, locale]);
  const availableRows = rows.filter(({ item }) => !excludedIds.has(item.id));
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visibleRows = normalizedQuery
    ? availableRows.filter(({ item, path }) =>
        `${path} ${item.nameAr} ${item.nameEn} ${item.nameHi ?? ""}`.toLocaleLowerCase(locale).includes(normalizedQuery)
      )
    : availableRows;
  const selectedRows = rows.filter(({ item }) => selectedIds.has(item.id));

  function toggle(id: string) {
    if (!multiple) {
      onChange(selectedIds.has(id) ? new Set() : new Set([id]));
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  const placeholder = locale === "ar" ? "ابحث بالاسم أو المسار…" : locale === "hi" ? "नाम या पथ से खोजें…" : "Search by name or path…";
  const noResults = locale === "ar" ? "لا توجد أقسام مطابقة" : locale === "hi" ? "कोई मेल खाता विभाग नहीं" : "No matching departments";

  return (
    <div className="department-picker">
      {selectedRows.length > 0 && (
        <div className="department-picker-selected">
          {selectedRows.map(({ item, path }) => (
            <button key={item.id} type="button" className="department-chip" onClick={() => toggle(item.id)} title={path}>
              <span>{path}</span><b aria-hidden="true">×</b>
            </button>
          ))}
        </div>
      )}
      <div className="department-picker-search">
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} autoComplete="off" />
      </div>
      <div className="department-picker-options" role={multiple ? "group" : "radiogroup"}>
        {visibleRows.length === 0 ? (
          <div className="department-picker-empty">{noResults}</div>
        ) : visibleRows.map(({ item, depth, path }) => (
          <label key={item.id} className={`department-picker-row${selectedIds.has(item.id) ? " selected" : ""}`} title={path}>
            <span className="department-tree-indent" style={{ width: depth * 18 }} aria-hidden="true" />
            <input
              type={multiple ? "checkbox" : "radio"}
              checked={selectedIds.has(item.id)}
              onChange={() => toggle(item.id)}
            />
            <span className="department-picker-name">{entityName(item, locale)}</span>
            {depth > 0 && <small>{path}</small>}
          </label>
        ))}
      </div>
    </div>
  );
}
