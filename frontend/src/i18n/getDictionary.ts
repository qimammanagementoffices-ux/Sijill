import "server-only";
import { defaultLocale } from "./config";

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
    exportXlsx: string;
    print: string;
    generatedAt: string;
    actionSuccess: string;
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
    rateLimited: string;
  };
  dashboard: {
    appName: string;
    appTagline: string;
    dashboardNav: string;
    adminEyebrow: string;
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
    backupsNav: string;
    siteMaintenanceNav: string;
    languagesNav: string;
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
  // Flat lookup for permission.<key with dots as underscores> translation
  // rows (descriptions, group headings, sub-headings) -- indexed by string
  // since permission keys are dynamic (the DB catalogue, not a fixed enum),
  // unlike every other dict section here. Singular "permission" to match
  // the translation key prefix ("permission.emp_view", ...).
  permission: Record<string, string>;
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
    accentColorLabel: string;
    platformNameLabel: string;
    platformNamePlaceholder: string;
    schoolNameLabel: string;
    schoolLabelLabel: string;
    subtitleLabel: string;
    logoLabel: string;
    uploadLogo: string;
    removeLogo: string;
    presetDefault: string;
    presetGreen: string;
    presetBlue: string;
    presetPurple: string;
    presetGray: string;
    save: string;
    saveSuccess: string;
    reset: string;
    resetConfirm: string;
  };
  backups: {
    title: string;
    runNow: string;
    running: string;
    columnFilename: string;
    columnSize: string;
    columnTriggeredBy: string;
    columnCreatedAt: string;
    triggeredScheduled: string;
    triggeredManual: string;
    triggeredPreRestore: string;
    download: string;
    noBackups: string;
    restore: string;
    restoreConfirmTitle: string;
    restoreConfirmWarning: string;
    pinLabel: string;
    restoreConfirm: string;
    restoreCancel: string;
    restoring: string;
    restoreSuccess: string;
    restoreFailed: string;
    restoreRateLimited: string;
    restoreInvalidPin: string;
    delete: string;
    deleteConfirm: string;
    deleteConfirmTitle: string;
    deleting: string;
    deleteFailed: string;
    deleteRateLimited: string;
    deleteInvalidPin: string;
  };
  // Site maintenance-mode (Phase 8) — the admin kill-switch and the public
  // page shown to everyone else while it's on. Deliberately named
  // "siteMaintenance*" throughout, not "maintenance*" — that prefix is
  // already used by the unrelated building-maintenance-request module
  // (fault reporting/repair workflow, see maintenancePartsNav etc. above).
  siteMaintenanceAdmin: {
    title: string;
    enabledLabel: string;
    messageArLabel: string;
    messageEnLabel: string;
    messageHiLabel: string;
    imageLabel: string;
    removeImage: string;
    reopenAtLabel: string;
    save: string;
    saveSuccess: string;
  };
  siteMaintenancePage: {
    title: string;
    defaultMessage: string;
    reopenLabel: string;
    reopenUnitDays: string;
    reopenUnitHours: string;
    reopenUnitMinutes: string;
    reopenUnitSeconds: string;
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
  adminLanguages: {
    title: string;
    builtInNote: string;
    columnCode: string;
    columnName: string;
    columnDirection: string;
    directionLtr: string;
    directionRtl: string;
    delete: string;
    deleteConfirm: string;
    review: string;
    editBuiltIn: string;
    addTitle: string;
    codeLabel: string;
    codeHint: string;
    nameLabel: string;
    directionLabel: string;
    add: string;
    adding: string;
    addFailed: string;
    reviewTitle: string;
    reviewBack: string;
    columnKey: string;
    columnValue: string;
    save: string;
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

async function fetchFlatDictionary(locale: string): Promise<Record<string, string>> {
  const res = await fetch(`${API_URL}/i18n/dictionary?locale=${locale}`, {
    next: { revalidate: 60 },
  });
  return res.ok ? res.json() : {};
}

// Accepts any locale string, not just the built-in Locale union -- admin-
// added languages (Phase 9) have codes the frontend never hardcodes.
export async function getDictionary(locale: string): Promise<Dictionary> {
  let flat = await fetchFlatDictionary(locale);
  // An empty map means the locale has no rows (deleted, or a stale cookie
  // from before it existed) -- every dict.section.key access downstream
  // assumes a fully populated object, so falling back here avoids a blank/
  // crashing page rather than surfacing the gap key-by-key.
  if (Object.keys(flat).length === 0 && locale !== defaultLocale) {
    flat = await fetchFlatDictionary(defaultLocale);
  }
  const nested: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    setPath(nested, key.split("."), value);
  }

  return nested as Dictionary;
}
