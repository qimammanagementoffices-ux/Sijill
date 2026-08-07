import "server-only";
import type { Locale } from "./config";

// One dictionary type shared by every locale file. Add keys here first,
// then fill them in every locale — this is what keeps ar/en (and later
// the third language) from drifting apart. See docs/api-conventions.md
// "Localized fields" for the equivalent rule on the backend/data side.
export type Dictionary = {
  common: {
    appName: string;
    loading: string;
    save: string;
    cancel: string;
  };
  onboarding: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    createAdmin: string;
    nameLabel: string;
    phoneLabel: string;
    pinLabel: string;
    pinConfirmLabel: string;
    submit: string;
  };
  login: {
    title: string;
    phoneLabel: string;
    pinLabel: string;
    submit: string;
    genericError: string;
  };
  dashboard: {
    welcomeMessage: string;
    logout: string;
    employeesNav: string;
    departmentsNav: string;
    jobTitlesNav: string;
    warehouseItemsNav: string;
    warehouseInvoicesNav: string;
    warehouseRequestsNav: string;
    warehouseCategoriesNav: string;
    translationsNav: string;
    maintenancePartsNav: string;
    maintenanceInvoicesNav: string;
    maintenanceRequestsNav: string;
    maintenanceCategoriesNav: string;
    maintenanceFaultTypesNav: string;
    roomsNav: string;
    assetsNav: string;
    assetCategoriesNav: string;
    assetRequestsNav: string;
    brandingNav: string;
  };
  errors: {
    generic: string;
  };
  employees: {
    title: string;
    searchPlaceholder: string;
    search: string;
    addNew: string;
    columnEmployeeNumber: string;
    columnName: string;
    columnPhone: string;
    columnJobTitle: string;
    columnDepartments: string;
    columnStatus: string;
    active: string;
    inactive: string;
    noResults: string;
    nameLabel: string;
    phoneLabel: string;
    pinLabel: string;
    pinConfirmLabel: string;
    emailLabel: string;
    nationalIdLabel: string;
    joinedDateLabel: string;
    jobTitleLabel: string;
    departmentsLabel: string;
    permissionsLabel: string;
    submitCreate: string;
    submitUpdate: string;
    deactivate: string;
    deactivateConfirm: string;
    resetPin: string;
    resetPinSubmit: string;
    conflictNotice: string;
  };
  structure: {
    departmentsTitle: string;
    jobTitlesTitle: string;
    nameArLabel: string;
    nameEnLabel: string;
    addNew: string;
    save: string;
  };
  warehouseItems: {
    title: string;
    searchPlaceholder: string;
    search: string;
    lowStockOnly: string;
    addNew: string;
    noResults: string;
    columnCode: string;
    columnName: string;
    columnCategory: string;
    columnQuantity: string;
    columnMinQuantity: string;
    columnStatus: string;
    lowStockBadge: string;
    okBadge: string;
    codeLabel: string;
    nameLabel: string;
    categoryLabel: string;
    unitLabel: string;
    minQuantityLabel: string;
    submitCreate: string;
    submitUpdate: string;
    deactivate: string;
  };
  warehouseInvoices: {
    title: string;
    addNew: string;
    noResults: string;
    columnNumber: string;
    columnDate: string;
    columnVendor: string;
    columnTotal: string;
    numberLabel: string;
    dateLabel: string;
    vendorLabel: string;
    taxRateLabel: string;
    addLine: string;
    itemLabel: string;
    quantityLabel: string;
    unitPriceLabel: string;
    subtotalLabel: string;
    taxTotalLabel: string;
    totalLabel: string;
    submit: string;
  };
  warehouseRequests: {
    title: string;
    addNew: string;
    noResults: string;
    columnRequester: string;
    columnDepartment: string;
    columnStatus: string;
    columnSuggestedStart: string;
    statusFilterAll: string;
    notesLabel: string;
    addLine: string;
    quantityRequestedLabel: string;
    quantityIssuedLabel: string;
    reasonLabel: string;
    submit: string;
    approve: string;
    reject: string;
    postpone: string;
    finish: string;
    statusPending: string;
    statusApproved: string;
    statusPostponed: string;
    statusRejected: string;
    statusClosed: string;
  };
  faultTypes: {
    title: string;
    addNew: string;
    nameArLabel: string;
    nameEnLabel: string;
    suggestedCategoryLabel: string;
    save: string;
  };
  maintenanceRequests: {
    title: string;
    addNew: string;
    noResults: string;
    columnRequester: string;
    columnDepartment: string;
    columnFaultType: string;
    columnPriority: string;
    columnStatus: string;
    columnSuggestedStart: string;
    statusFilterAll: string;
    faultTypeLabel: string;
    locationLabel: string;
    priorityLabel: string;
    descriptionLabel: string;
    submit: string;
    approve: string;
    reject: string;
    postpone: string;
    start: string;
    finish: string;
    partsUsedLabel: string;
    addPart: string;
    itemLabel: string;
    quantityLabel: string;
    reasonLabel: string;
    statusPending: string;
    statusApproved: string;
    statusPostponed: string;
    statusRejected: string;
    statusInProgress: string;
    statusClosed: string;
    priorityLow: string;
    priorityMedium: string;
    priorityHigh: string;
    priorityUrgent: string;
  };
  attachments: {
    title: string;
    upload: string;
    delete: string;
    deleteConfirm: string;
    uploading: string;
    noAttachments: string;
    unsupportedType: string;
    tooLarge: string;
  };
  branding: {
    title: string;
    presetLabel: string;
    colorLabel: string;
    logoLabel: string;
    save: string;
    reset: string;
    resetConfirm: string;
  };
  rooms: {
    title: string;
    addNew: string;
    roomNumberLabel: string;
    nameArLabel: string;
    nameEnLabel: string;
    buildingLabel: string;
    floorLabel: string;
    save: string;
  };
  assets: {
    title: string;
    addNew: string;
    noResults: string;
    columnAssetNumber: string;
    columnName: string;
    columnCategory: string;
    columnRoom: string;
    columnCustodian: string;
    columnStatus: string;
    assetNumberLabel: string;
    nameArLabel: string;
    nameEnLabel: string;
    categoryLabel: string;
    roomLabel: string;
    custodianLabel: string;
    statusLabel: string;
    acquisitionDateLabel: string;
    acquisitionCostLabel: string;
    vendorLabel: string;
    notesLabel: string;
    submitCreate: string;
    submitUpdate: string;
    statusActive: string;
    statusMaintenance: string;
    statusRetired: string;
    downloadQr: string;
    transferHistory: string;
    transferButton: string;
    custodyReportTitle: string;
    custodyReportPrint: string;
    custodyReportGeneratedAt: string;
    custodyReportTotalCount: string;
  };
  assetRequests: {
    title: string;
    addNew: string;
    noResults: string;
    columnRequester: string;
    columnAsset: string;
    columnStatus: string;
    columnSuggestedStart: string;
    statusFilterAll: string;
    assetLabel: string;
    reasonLabel: string;
    submit: string;
    approve: string;
    reject: string;
    postpone: string;
    finish: string;
    statusPending: string;
    statusApproved: string;
    statusPostponed: string;
    statusRejected: string;
    statusClosed: string;
  };
  publicAsset: {
    notFound: string;
    title: string;
  };
  adminTranslations: {
    title: string;
    searchPlaceholder: string;
    search: string;
    columnKey: string;
    columnEn: string;
    columnAr: string;
    columnHi: string;
    save: string;
    conflictNotice: string;
  };
};

// DB-backed now (Phase i18n): GET /api/v1/i18n/dictionary?locale=xx returns
// a flat { "employees.title": "...", ... } map — see
// backend/src/main/java/sa/sijill/api/web/TranslationController.java. Keys
// are dot-namespaced to mirror this file's nested Dictionary shape exactly,
// so every existing dict.employees.title-style call site across the app
// keeps working unchanged; only this function's internals changed.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function setPath(target: Record<string, unknown>, path: string[], value: string) {
  let node = target;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!;
    if (typeof node[segment] !== "object" || node[segment] === null) {
      node[segment] = {};
    }
    node = node[segment] as Record<string, unknown>;
  }
  node[path[path.length - 1]!] = value;
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const res = await fetch(`${API_URL}/i18n/dictionary?locale=${locale}`, {
    next: { revalidate: 60 },
  });

  const flat: Record<string, string> = res.ok ? await res.json() : {};
  const nested: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    setPath(nested, key.split("."), value);
  }

  return nested as Dictionary;
}
