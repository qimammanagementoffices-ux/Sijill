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

export function isValidEmployeeDepartmentSelection(items: LocalizedEntityDto[], selectedIds: Set<string>) {
  const selected = items.filter((item) => selectedIds.has(item.id));
  const roots = selected.filter((item) => !item.parentId);
  if (roots.length === 0 || selected.length !== selectedIds.size) return false;

  const byId = new Map(items.map((item) => [item.id, item]));
  const rootIds = new Set(roots.map((root) => root.id));
  return selected.every((item) => {
    let current: LocalizedEntityDto | undefined = item;
    const visited = new Set<string>();
    while (current?.parentId) {
      if (visited.has(current.id)) return false;
      visited.add(current.id);
      current = byId.get(current.parentId);
    }
    return current != null && rootIds.has(current.id);
  });
}

export default function DepartmentHierarchyPicker({
  departments,
  selectedIds,
  onChange,
  locale,
  multiple = true,
  excludedIds = new Set<string>(),
  employeeAssignment = false,
}: {
  departments: LocalizedEntityDto[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  locale: string;
  multiple?: boolean;
  excludedIds?: Set<string>;
  employeeAssignment?: boolean;
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
  const rootRows = availableRows.filter(({ depth }) => depth === 0);
  const selectedRootRows = rootRows.filter(({ item }) => selectedIds.has(item.id));
  const descendantGroups = selectedRootRows.map((rootRow) => {
    const rootIndex = availableRows.findIndex(({ item }) => item.id === rootRow.item.id);
    const following = availableRows.slice(rootIndex + 1);
    const nextRootIndex = following.findIndex(({ depth }) => depth === 0);
    return {
      root: rootRow,
      descendants: (nextRootIndex < 0 ? following : following.slice(0, nextRootIndex)).filter(({ depth }) => depth > 0),
    };
  });

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

  function chooseRoot(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      for (const descendantId of departmentDescendantIds(departments, id)) next.delete(descendantId);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  function removeSelected(id: string) {
    const row = rows.find(({ item }) => item.id === id);
    if (employeeAssignment && row?.depth === 0) {
      chooseRoot(id);
      return;
    }
    toggle(id);
  }

  const placeholder = locale === "ar" ? "ابحث بالاسم أو المسار…" : locale === "hi" ? "नाम या पथ से खोजें…" : "Search by name or path…";
  const noResults = locale === "ar" ? "لا توجد أقسام مطابقة" : locale === "hi" ? "कोई मेल खाता विभाग नहीं" : "No matching departments";
  const subdivisionsLabel = locale === "ar" ? "المراحل والأقسام (اختياري — يمكن اختيار أكثر من واحد)" : locale === "hi" ? "चरण और विभाग (वैकल्पिक — एकाधिक विकल्प)" : "Stages and departments (optional — multiple choices)";

  const matchesQuery = ({ item, path }: DepartmentTreeRow) =>
    !normalizedQuery || `${path} ${item.nameAr} ${item.nameEn} ${item.nameHi ?? ""}`.toLocaleLowerCase(locale).includes(normalizedQuery);

  return (
    <div className="department-picker">
      {selectedRows.length > 0 && (
        <div className="department-picker-selected">
          {selectedRows.map(({ item, path }) => (
            <button key={item.id} type="button" className="department-chip" onClick={() => removeSelected(item.id)} title={path}>
              <span>{path}</span><b aria-hidden="true">×</b>
            </button>
          ))}
        </div>
      )}
      <div className="department-picker-search">
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} autoComplete="off" />
      </div>
      {employeeAssignment ? (
        <div className="department-assignment-options">
          <div className="department-picker-options" role="group">
            {rootRows.filter(matchesQuery).length === 0 ? <div className="department-picker-empty">{noResults}</div> : rootRows.filter(matchesQuery).map(({ item }) => (
              <label key={item.id} className={`department-picker-row${selectedIds.has(item.id) ? " selected" : ""}`}>
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => chooseRoot(item.id)} />
                <span className="department-picker-name">{entityName(item, locale)}</span>
              </label>
            ))}
          </div>
          {descendantGroups.length > 0 && (
            <>
              <div className="department-picker-group-title optional">{subdivisionsLabel}</div>
              <div className="department-picker-options" role="group">
                {descendantGroups.map(({ root, descendants }) => (
              <div className="department-picker-subgroup" key={root.item.id}>
                <div className="department-picker-subgroup-title">{root.path}</div>
                {descendants.filter(matchesQuery).length === 0 ? (
                  <div className="department-picker-empty">{noResults}</div>
                ) : descendants.filter(matchesQuery).map(({ item, depth, path }) => (
                  <label key={item.id} className={`department-picker-row${selectedIds.has(item.id) ? " selected" : ""}`} title={path}>
                    <span className="department-tree-indent" style={{ width: Math.max(0, depth - 1) * 18 }} aria-hidden="true" />
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} />
                    <span className="department-picker-name">{entityName(item, locale)}</span>
                    {depth > 1 && <small>{path}</small>}
                  </label>
                ))}
              </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}
