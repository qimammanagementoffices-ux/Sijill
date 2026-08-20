export const WAREHOUSE_REQUEST_QUEUE_PERMISSIONS = [
  "wh.view",
  "wh.act.approve",
  "wh.act.reject",
  "wh.act.postpone",
  "wh.act.finish",
  "wh.act.countersign",
] as const;

export const WAREHOUSE_REQUEST_PAGE_PERMISSIONS = [
  "wh.request",
  ...WAREHOUSE_REQUEST_QUEUE_PERMISSIONS,
] as const;

export const MAINTENANCE_REQUEST_QUEUE_PERMISSIONS = [
  "mt.view",
  "mt.act.approve",
  "mt.act.reject",
  "mt.act.postpone",
  "mt.act.start",
  "mt.act.finish",
  "mt.act.countersign",
] as const;

export const MAINTENANCE_REQUEST_PAGE_PERMISSIONS = [
  "mt.request",
  ...MAINTENANCE_REQUEST_QUEUE_PERMISSIONS,
] as const;

export const ASSET_REQUEST_QUEUE_PERMISSIONS = [
  "as.view",
  "as.act.approve",
  "as.act.reject",
  "as.act.postpone",
  "as.act.finish",
  "as.act.countersign",
] as const;

export const ASSET_REQUEST_PAGE_PERMISSIONS = [
  "as.request",
  ...ASSET_REQUEST_QUEUE_PERMISSIONS,
] as const;

export function hasAnyPermission(permissions: readonly string[], required: readonly string[]): boolean {
  return required.some((permission) => permissions.includes(permission));
}

const ROUTE_RULES: { path: string; anyOf: readonly string[] }[] = [
  { path: "/employees/permissions-overview", anyOf: ["emp.manage"] },
  { path: "/employees", anyOf: ["emp.view", "emp.manage"] },
  { path: "/departments", anyOf: ["emp.structure"] },
  { path: "/job-titles", anyOf: ["emp.structure"] },
  { path: "/warehouse/items", anyOf: ["wh.view", "wh.items", "wh.qty"] },
  { path: "/warehouse/invoices", anyOf: ["wh.invoices", "wh.invoices.edit"] },
  { path: "/warehouse/costs", anyOf: ["wh.costs"] },
  { path: "/warehouse/requests", anyOf: WAREHOUSE_REQUEST_PAGE_PERMISSIONS },
  { path: "/maintenance/parts", anyOf: ["mt.view", "wh.view", "wh.items", "wh.qty"] },
  { path: "/maintenance/invoices", anyOf: ["wh.invoices", "wh.invoices.edit"] },
  { path: "/maintenance/costs", anyOf: ["wh.costs"] },
  { path: "/maintenance/fault-types", anyOf: ["wh.items"] },
  { path: "/maintenance/requests", anyOf: MAINTENANCE_REQUEST_PAGE_PERMISSIONS },
  { path: "/asset-requests", anyOf: ASSET_REQUEST_PAGE_PERMISSIONS },
  { path: "/assets/acquisitions", anyOf: ["as.view", "as.manage"] },
  { path: "/assets/custody-report", anyOf: ["as.view", "as.manage"] },
  { path: "/assets", anyOf: ["as.view", "as.manage"] },
  { path: "/rooms", anyOf: ["as.view", "as.manage"] },
  { path: "/admin/translations", anyOf: ["sys.translations"] },
  { path: "/admin/languages", anyOf: ["sys.translations"] },
  { path: "/admin/branding", anyOf: ["sys.branding"] },
  { path: "/admin/backups", anyOf: ["sys.backup"] },
  { path: "/admin/official-holidays", anyOf: ["sys.maintenance"] },
  { path: "/admin/site-maintenance", anyOf: ["sys.maintenance"] },
  { path: "/admin/review-policy", anyOf: ["sys.review.policy"] },
  { path: "/admin/audit-log", anyOf: ["sys.audit.view"] },
];

export function canAccessAppPath(pathname: string | null, permissions: readonly string[]): boolean {
  if (!pathname || pathname === "/dashboard") return true;
  const rule = ROUTE_RULES.find(({ path }) => pathname === path || pathname.startsWith(path + "/"));
  return !rule || hasAnyPermission(permissions, rule.anyOf);
}
