// Shared shapes returned by the Phase 2b employee/structure endpoints.
// Kept in one place so the directory, form, and detail views agree.

export type LocalizedRef = { id: string; ar: string; en: string };

export type TranslationRow = {
  key: string;
  valueAr: string;
  valueEn: string;
  valueHi: string | null;
  version: number;
};

export type LanguageDto = {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
};

export type TranslationExtraValueDto = {
  key: string;
  value: string;
};

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

// --- Maintenance (Phase 4) ---

export type FaultTypeDto = {
  id: string;
  nameAr: string;
  nameEn: string;
  suggestedCategory: LocalizedRef | null;
  version: number;
};

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MaintenanceRequestStatusValue =
  | "PENDING"
  | "APPROVED"
  | "POSTPONED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "CLOSED";

export type PartUsedDto = {
  inventoryItemId: string;
  itemCode: string;
  itemNameAr: string;
  itemNameEn: string;
  quantity: number;
};

export type MaintenanceRequestActionDto = {
  actorName: string;
  action: string;
  reason: string | null;
  createdAt: string;
};

export type MaintenanceRequestListItem = {
  id: string;
  requesterName: string;
  department: LocalizedRef | null;
  faultType: LocalizedRef | null;
  priority: MaintenancePriority;
  status: MaintenanceRequestStatusValue;
  suggestedStartDate: string | null;
};

export type MaintenanceRequestDetail = {
  id: string;
  requesterId: string;
  requesterName: string;
  department: LocalizedRef | null;
  faultType: LocalizedRef | null;
  location: string | null;
  priority: MaintenancePriority;
  description: string | null;
  status: MaintenanceRequestStatusValue;
  suggestedStartDate: string | null;
  partsUsed: PartUsedDto[];
  actions: MaintenanceRequestActionDto[];
  version: number;
};

// --- Assets (Phase 5) ---

export type RoomDto = {
  id: string;
  roomNumber: string;
  nameAr: string;
  nameEn: string;
  building: string | null;
  floor: string | null;
  active: boolean;
  version: number;
};

export type AssetStatusValue = "ACTIVE" | "MAINTENANCE" | "RETIRED";

export type AssetListItem = {
  id: string;
  assetNumber: string;
  nameAr: string;
  nameEn: string;
  category: LocalizedRef | null;
  room: LocalizedRef | null;
  custodianName: string | null;
  status: AssetStatusValue;
};

export type AssetDetail = {
  id: string;
  assetNumber: string;
  nameAr: string;
  nameEn: string;
  category: LocalizedRef | null;
  room: LocalizedRef | null;
  custodianId: string | null;
  custodianName: string | null;
  status: AssetStatusValue;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  vendor: string | null;
  notes: string | null;
  publicToken: string;
  version: number;
};

export type AssetTransferDto = {
  fromRoom: LocalizedRef | null;
  toRoom: LocalizedRef | null;
  fromEmployeeName: string | null;
  toEmployeeName: string | null;
  actorName: string;
  reason: string | null;
  createdAt: string;
};

export type AssetRequestActionDto = { actorName: string; action: string; reason: string | null; createdAt: string };

export type AssetRequestListItem = {
  id: string;
  requesterName: string;
  assetNumber: string;
  assetNameAr: string;
  assetNameEn: string;
  status: "PENDING" | "APPROVED" | "POSTPONED" | "REJECTED" | "CLOSED";
  suggestedStartDate: string | null;
};

// --- Media / branding (Phase 6a) ---

export type AttachmentOwnerType = "INVENTORY_ITEM" | "ROOM" | "ASSET" | "BRANDING";

export type AttachmentDto = {
  id: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string | null;
  createdAt: string;
};

export type BackupSnapshotDto = {
  id: string;
  filename: string;
  sizeBytes: number;
  triggeredBy: "SCHEDULED" | "MANUAL" | "PRE_RESTORE";
  createdAt: string;
};

export type BrandingDto = {
  preset: string;
  primaryColor: string;
  logoAttachmentId: string | null;
  logoUrl: string | null;
  version: number;
};

export type MaintenanceDto = {
  enabled: boolean;
  messageAr: string | null;
  messageEn: string | null;
  messageHi: string | null;
  imageAttachmentId: string | null;
  imageUrl: string | null;
  reopenAt: string | null;
  version: number;
};

export type AssetRequestDetail = {
  id: string;
  requesterId: string;
  requesterName: string;
  assetId: string;
  assetNumber: string;
  assetNameAr: string;
  assetNameEn: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "POSTPONED" | "REJECTED" | "CLOSED";
  suggestedStartDate: string | null;
  actions: AssetRequestActionDto[];
  version: number;
};
