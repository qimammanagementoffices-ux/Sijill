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
  photoAttachmentId: string | null;
  photoUrl: string | null;
  version: number;
};

export type PagedResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CostBreakdownRow = { nameAr: string; nameEn: string; total: number };
export type CostDashboardDto = {
  total: number;
  byDepartment: CostBreakdownRow[];
  byRequester: CostBreakdownRow[];
};

export type PermissionDto = { key: string; description: string };
export type PermissionOverviewDto = { key: string; employeeCount: number };

export type LocalizedEntityDto = {
  id: string;
  nameAr: string;
  nameEn: string;
  nameHi: string | null;
  version: number;
  parentId: string | null;
};

// --- Warehouse (Phase 3a) ---

export type CategoryDto = {
  id: string;
  nameAr: string;
  nameEn: string;
  nameHi: string | null;
  icon: string | null;
  active: boolean;
  version: number;
};

export type InventoryItemListItem = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: LocalizedRef | null;
  quantity: number;
  quantityRequested: number;
  minQuantity: number;
  lowStock: boolean;
  unit: string | null;
  dateAdded: string | null;
  lastPurchasePrice: number | null;
  imageUrl: string | null;
  active: boolean;
};

export type ItemPurchaseLine = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  vendor: string | null;
  quantity: number;
  unitPrice: number | null;
  taxRate: number | null;
  lineTotal: number | null;
};

export type ItemRequestLine = {
  requestId: string;
  createdAt: string;
  status: string;
  requesterName: string | null;
  departmentName: string | null;
  quantityRequested: number;
  quantityIssued: number | null;
};

export type InventoryItemDetail = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  nameHi: string | null;
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
  itemQuantity: number;
  itemUnit: string | null;
  quantityRequested: number;
  // Set when an approver trimmed the line; delivery caps against this.
  quantityApproved: number | null;
  removed: boolean;
  quantityIssued: number | null;
};

export type RequestActionLineEdit = {
  lineId: string | null;
  quantityBefore: number;
  quantityAfter: number | null;
  removed: boolean;
};

export type NeedRequestActionDto = {
  actorName: string | null;
  action: string;
  reason: string | null;
  createdAt: string;
  lineEdits: RequestActionLineEdit[];
};

export type NeedRequestStatusValue =
  | "PENDING"
  | "APPROVED_UNDER_REVIEW"
  | "REJECTED_UNDER_REVIEW"
  | "APPROVED"
  | "POSTPONED"
  | "REJECTED"
  | "DELIVERED"
  | "CLOSED";

export type NeedRequestListItem = {
  id: string;
  requestNumber: number;
  requesterId: string;
  requesterName: string;
  requesterJobTitle: string | null;
  department: LocalizedRef | null;
  category: LocalizedRef | null;
  status: NeedRequestStatusValue;
  suggestedStartDate: string | null;
  postponedUntil: string | null;
  editableUntil: string;
  canEdit: boolean;
  returnedBySenior: boolean;
  archivedAt: string | null;
  notes: string | null;
  lines: NeedRequestLineDto[];
  actions: NeedRequestActionDto[];
  attachments: AttachmentDto[];
  // Proof of delivery filed by the storekeeper, kept apart from the
  // requester's own attachments.
  deliveryAttachments: AttachmentDto[];
};

export type NeedRequestDetail = {
  id: string;
  requestNumber: number;
  requesterId: string;
  requesterName: string;
  department: LocalizedRef | null;
  category: LocalizedRef | null;
  room: LocalizedRef | null;
  notes: string | null;
  status: NeedRequestStatusValue;
  suggestedStartDate: string | null;
  postponedUntil: string | null;
  editableUntil: string;
  canEdit: boolean;
  returnedBySenior: boolean;
  archivedAt: string | null;
  lines: NeedRequestLineDto[];
  actions: NeedRequestActionDto[];
  version: number;
};

// Body shared by every decision endpoint: comment, the postpone date when the
// decision is a postponement, and the line trims made in the same modal.
export type RequestDecisionBody = {
  comment?: string | null;
  postponedUntil?: string | null;
  lines?: { lineId: string; quantity: number | null; removed: boolean }[];
};

// --- Maintenance (Phase 4) ---

export type FaultTypeDto = {
  id: string;
  nameAr: string;
  nameEn: string;
  nameHi: string | null;
  suggestedCategory: LocalizedRef | null;
  version: number;
};

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MaintenanceRequestStatusValue =
  | "PENDING"
  | "APPROVED_UNDER_REVIEW"
  | "REJECTED_UNDER_REVIEW"
  | "APPROVED"
  | "POSTPONED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "DONE"
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
  requestNumber: number;
  requesterId: string;
  requesterName: string;
  requesterJobTitle: string | null;
  department: LocalizedRef | null;
  faultType: LocalizedRef | null;
  priority: MaintenancePriority;
  status: MaintenanceRequestStatusValue;
  suggestedStartDate: string | null;
  postponedUntil: string | null;
  returnedBySenior: boolean;
  archivedAt: string | null;
  location: string | null;
  description: string | null;
  actions: MaintenanceRequestActionDto[];
  attachments: AttachmentDto[];
};

export type MaintenanceRequestDetail = {
  id: string;
  requestNumber: number;
  requesterId: string;
  requesterName: string;
  department: LocalizedRef | null;
  faultType: LocalizedRef | null;
  location: string | null;
  priority: MaintenancePriority;
  description: string | null;
  status: MaintenanceRequestStatusValue;
  suggestedStartDate: string | null;
  postponedUntil: string | null;
  returnedBySenior: boolean;
  archivedAt: string | null;
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
  nameHi: string | null;
  departmentId: string | null;
  departmentNameAr: string | null;
  departmentNameEn: string | null;
  custodianId: string | null;
  custodianName: string | null;
  active: boolean;
  version: number;
  assetCount: number;
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
  thumbnailUrl: string | null;
};

export type AssetAcquisitionDto = {
  id: string;
  documentNumber: string;
  documentDate: string;
  vendor: string | null;
  amount: number;
  notes: string | null;
  assets: { id: string; assetNumber: string; nameAr: string; nameEn: string }[];
  version: number;
};

export type AssetDetail = {
  id: string;
  assetNumber: string;
  nameAr: string;
  nameEn: string;
  nameHi: string | null;
  category: LocalizedRef | null;
  room: LocalizedRef | null;
  custodianId: string | null;
  custodianName: string | null;
  status: AssetStatusValue;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  vendor: string | null;
  notes: string | null;
  depreciationRate: number | null;
  accumulatedDepreciation: number | null;
  periodEndBalance: number | null;
  periodEndDate: string | null;
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

export type AssetRequestPurpose = "PURCHASE" | "MAINTENANCE" | "TRANSFER";
export type AssetRequestPriority = "NORMAL" | "URGENT";
// Added with the asset request edit window; see NeedRequestListItem for the
// same pair.
export type AssetRequestEditFields = {
  editableUntil: string;
  canEdit: boolean;
};

export type AssetRequestLineDto = {
  id: string;
  assetId: string | null;
  assetNumber: string | null;
  assetNameAr: string | null;
  assetNameEn: string | null;
  categoryId: string | null;
  categoryNameAr: string | null;
  categoryNameEn: string | null;
  quantity: number;
};

export type AssetRequestListItem = AssetRequestEditFields & {
  id: string;
  requestNumber: number;
  requesterId: string;
  requesterName: string;
  requesterJobTitle: string | null;
  assetNumber: string;
  assetNameAr: string;
  assetNameEn: string;
  department: LocalizedRef | null;
  room: LocalizedRef | null;
  destinationRoom: LocalizedRef | null;
  purpose: AssetRequestPurpose | null;
  priority: AssetRequestPriority | null;
  reason: string | null;
  status: AssetRequestStatusValue;
  suggestedStartDate: string | null;
  postponedUntil: string | null;
  returnedBySenior: boolean;
  archivedAt: string | null;
  lines: AssetRequestLineDto[];
  actions: AssetRequestActionDto[];
  attachments: AttachmentDto[];
};

export type AssetRequestStatusValue =
  | "PENDING"
  | "APPROVED_UNDER_REVIEW"
  | "REJECTED_UNDER_REVIEW"
  | "APPROVED"
  | "POSTPONED"
  | "REJECTED"
  | "CLOSED";

// --- Media / branding (Phase 6a) ---

export type AttachmentOwnerType =
  | "INVENTORY_ITEM"
  | "ROOM"
  | "ASSET"
  | "BRANDING"
  | "MAINTENANCE"
  | "EMPLOYEE"
  | "NEED_REQUEST"
  | "NEED_REQUEST_DELIVERY"
  | "ASSET_REQUEST"
  | "ASSET_ACQUISITION"
  | "WAREHOUSE_INVOICE";

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
  accentColor: string;
  platformName: string | null;
  platformNameEn: string | null;
  platformNameHi: string | null;
  schoolName: string | null;
  schoolNameEn: string | null;
  schoolNameHi: string | null;
  schoolLabel: string | null;
  subtitle: string | null;
  logoAttachmentId: string | null;
  logoUrl: string | null;
  version: number;
};

// Whether a first-level decision parks the request for a counter-signature,
// chosen per system.
export type ReviewPolicyDto = {
  warehouseTwoLevel: boolean;
  maintenanceTwoLevel: boolean;
  assetTwoLevel: boolean;
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

export type OfficialHolidayDto = {
  date: string;
  name: string | null;
};

export type AssetRequestDetail = {
  id: string;
  requestNumber: number;
  requesterId: string;
  requesterName: string;
  assetId: string | null;
  assetNumber: string;
  assetNameAr: string;
  assetNameEn: string;
  department: LocalizedRef | null;
  room: LocalizedRef | null;
  destinationRoom: LocalizedRef | null;
  purpose: AssetRequestPurpose | null;
  priority: AssetRequestPriority | null;
  reason: string | null;
  status: AssetRequestStatusValue;
  suggestedStartDate: string | null;
  postponedUntil: string | null;
  returnedBySenior: boolean;
  archivedAt: string | null;
  lines: AssetRequestLineDto[];
  actions: AssetRequestActionDto[];
  attachments: AttachmentDto[];
  version: number;
};
