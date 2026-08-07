// Shared shapes returned by the Phase 2b employee/structure endpoints.
// Kept in one place so the directory, form, and detail views agree.

export type LocalizedRef = { id: string; ar: string; en: string };

export type EmployeeListItem = {
  id: string;
  employeeNumber: string;
  name: string;
  phone: string;
  jobTitle: LocalizedRef | null;
  departments: LocalizedRef[];
  active: boolean;
};

export type EmployeeDetail = {
  id: string;
  employeeNumber: string;
  name: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  joinedDate: string | null;
  active: boolean;
  jobTitle: LocalizedRef | null;
  departments: LocalizedRef[];
  permissions: string[];
  version: number;
};

export type PagedResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PermissionDto = { key: string; description: string };

export type LocalizedEntityDto = { id: string; nameAr: string; nameEn: string; version: number };

// --- Warehouse (Phase 3a) ---

export type CategoryDto = { id: string; nameAr: string; nameEn: string; active: boolean; version: number };

export type InventoryItemListItem = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: LocalizedRef | null;
  quantity: number;
  minQuantity: number;
  lowStock: boolean;
  unit: string | null;
  active: boolean;
};

export type InventoryItemDetail = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: LocalizedRef | null;
  quantity: number;
  unit: string | null;
  weight: number | null;
  dateAdded: string | null;
  minQuantity: number;
  lowStock: boolean;
  lastPurchasePrice: number | null;
  taxRate: number | null;
  taxInclusivePrice: number | null;
  active: boolean;
  version: number;
};

export type InvoiceLineDto = {
  inventoryItemId: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendor: string;
  taxRate: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: InvoiceLineDto[];
  version: number;
};

export type NeedRequestLineDto = {
  id: string;
  inventoryItemId: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  quantityRequested: number;
  quantityIssued: number | null;
};

export type NeedRequestActionDto = { actorName: string; action: string; reason: string | null; createdAt: string };

export type NeedRequestListItem = {
  id: string;
  requesterName: string;
  department: LocalizedRef | null;
  status: "PENDING" | "APPROVED" | "POSTPONED" | "REJECTED" | "CLOSED";
  suggestedStartDate: string | null;
};

export type NeedRequestDetail = {
  id: string;
  requesterId: string;
  requesterName: string;
  department: LocalizedRef | null;
  category: LocalizedRef | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "POSTPONED" | "REJECTED" | "CLOSED";
  suggestedStartDate: string | null;
  lines: NeedRequestLineDto[];
  actions: NeedRequestActionDto[];
  version: number;
};
