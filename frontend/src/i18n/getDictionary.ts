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
    exportPdf: string;
    currency: string;
    rowsPerPage: string;
    print: string;
    generatedAt: string;
    actionSuccess: string;
    search: string;
    retry: string;
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
    phonePlaceholder: string;
    pinLabel: string;
    pinPlaceholder: string;
    submit: string;
    genericError: string;
    rateLimited: string;
    pinHint: string;
  };
  dashboard: {
    appName: string;
    appTagline: string;
    dashboardNav: string;
    mainSectionsEyebrow: string;
    employeesGroupNav: string;
    warehouseGroupNav: string;
    maintenanceGroupNav: string;
    assetsGroupNav: string;
    adminEyebrow: string;
    welcomeMessage: string;
    logout: string;
    editProfile: string;
    employeesNav: string;
    departmentsNav: string;
    jobTitlesNav: string;
    warehouseItemsNav: string;
    warehouseInvoicesNav: string;
    warehouseCostsNav: string;
    warehouseRequestsNav: string;
    warehouseCategoriesNav: string;
    translationsNav: string;
    maintenancePartsNav: string;
    maintenanceInvoicesNav: string;
    maintenanceCostsNav: string;
    maintenanceRequestsNav: string;
    maintenanceCategoriesNav: string;
    maintenanceFaultTypesNav: string;
    roomsNav: string;
    assetsNav: string;
    assetCategoriesNav: string;
    assetRequestsNav: string;
    assetAcquisitionsNav: string;
    brandingNav: string;
    backupsNav: string;
    siteMaintenanceNav: string;
    reviewPolicyNav: string;
    officialHolidaysNav: string;
    languagesNav: string;
    permissionsOverviewNav: string;
    quickActionsTitle: string;
    assetRequestsShortcut: string;
    newAssetRequestShortcut: string;
    warehouseNeedsShortcut: string;
    newWarehouseRequestShortcut: string;
    maintenanceNeedsShortcut: string;
    newMaintenanceRequestShortcut: string;
  };
  dashboardStats: {
    warehouseTitle: string;
    warehouseSubtitle: string;
    warehouseItemCount: string;
    warehouseTotalQuantity: string;
    warehouseLowStock: string;
    warehousePendingRequests: string;
    maintenanceTitle: string;
    maintenanceSubtitle: string;
    maintenanceOpen: string;
    maintenanceInProgress: string;
    maintenanceCompleted: string;
    maintenanceUrgent: string;
    assetsTitle: string;
    assetsSubtitle: string;
    assetsRooms: string;
    assetsAssets: string;
    assetsPendingRequests: string;
  };
  errors: {
    generic: string;
  };
  employees: {
    title: string;
    searchPlaceholder: string;
    search: string;
    filterAllDepartments: string;
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
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    pinLabel: string;
    pinPlaceholder: string;
    pinConfirmLabel: string;
    emailLabel: string;
    emailPlaceholder: string;
    nationalIdLabel: string;
    nationalIdPlaceholder: string;
    joinedDateLabel: string;
    jobTitleLabel: string;
    photoLabel: string;
    removePhoto: string;
    departmentsLabel: string;
    departmentsHint: string;
    permissionsLabel: string;
    submitCreate: string;
    submitUpdate: string;
    deactivate: string;
    deactivateConfirm: string;
    reactivate: string;
    reactivateConfirm: string;
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
  categoriesModal: {
    iconLabel: string;
    iconPlaceholder: string;
    nameArLabel: string;
    nameEnLabel: string;
    nameHiLabel: string;
    namePlaceholder: string;
    autoTranslate: string;
    autoTranslateNote: string;
    addNew: string;
    done: string;
    removeConfirm: string;
    noResults: string;
  };
  // Flat lookup for permission.<key with dots as underscores> translation
  // rows (descriptions, group headings, sub-headings) -- indexed by string
  // since permission keys are dynamic (the DB catalogue, not a fixed enum),
  // unlike every other dict section here. Singular "permission" to match
  // the translation key prefix ("permission.emp_view", ...).
  permission: Record<string, string>;
  permissionsOverview: {
    title: string;
    nav: string;
  };
  reviewPolicy: {
    title: string;
    description: string;
    warehouse: string;
    maintenance: string;
    asset: string;
    openRequestsNote: string;
  };
  warehouseItems: {
    title: string;
    searchPlaceholder: string;
    search: string;
    lowStockOnly: string;
    addNew: string;
    noResults: string;
    columnImage: string;
    columnCode: string;
    columnName: string;
    columnCategory: string;
    columnDateAdded: string;
    columnLastPurchase: string;
    columnQuantity: string;
    columnQuantityRequested: string;
    columnUnit: string;
    columnMinQuantity: string;
    columnStatus: string;
    lowStockBadge: string;
    okBadge: string;
    codeLabel: string;
    nameLabel: string;
    namePlaceholder: string;
    categoryLabel: string;
    unitLabel: string;
    unitPlaceholder: string;
    weightLabel: string;
    weightOptional: string;
    weightPlaceholder: string;
    dateAddedLabel: string;
    initialQuantityLabel: string;
    quantityManualHint: string;
    imagesLabel: string;
    uploadImages: string;
    noImagesChosen: string;
    pdfLabel: string;
    uploadPdf: string;
    noPdfChosen: string;
    cardTitle: string;
    cardBasicInfo: string;
    cardPurchaseHistory: string;
    cardNoPurchases: string;
    cardRequestHistory: string;
    cardNoRequests: string;
    cardInvoiceNumber: string;
    cardVendor: string;
    cardUnitPrice: string;
    cardLineTotal: string;
    cardTax: string;
    cardRequester: string;
    cardRequestDate: string;
    cardDepartment: string;
    cardQuantityRequested: string;
    cardQuantityIssued: string;
    cardEdit: string;
    filterAllCategories: string;
    filterDateFrom: string;
    filterDateTo: string;
    filterClear: string;
    reportTitle: string;
    minQuantityLabel: string;
    submitCreate: string;
    submitUpdate: string;
    deactivate: string;
    categoriesButton: string;
    categoriesTitle: string;
    categoriesDescription: string;
  };
  // Overrides layered over warehouseItems on the maintenance-parts screen,
  // which is the same component against the MAINTENANCE domain.
  maintenanceParts: {
    title: string;
    reportTitle: string;
    addNew: string;
    noResults: string;
    categoriesTitle: string;
    categoriesDescription: string;
  };
  warehouseInvoices: {
    title: string;
    addNew: string;
    noResults: string;
    columnNumber: string;
    columnDate: string;
    columnVendor: string;
    columnLineCount: string;
    columnTotal: string;
    cardTitle: string;
    filterDateFrom: string;
    filterDateTo: string;
    filterClear: string;
    numberLabel: string;
    numberPlaceholder: string;
    vendorPlaceholder: string;
    postConfirm: string;
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
    attachmentsHint: string;
    attachmentsFailed: string;
    submit: string;
  };
  // Shared by every request type (need / maintenance / asset) -- the flow and
  // its wording are the same, only the domain differs.
  requestStatus: {
    PENDING: string;
    APPROVED_UNDER_REVIEW: string;
    REJECTED_UNDER_REVIEW: string;
    APPROVED: string;
    POSTPONED: string;
    REJECTED: string;
    DELIVERED: string;
    CLOSED: string;
    IN_PROGRESS: string;
    DONE: string;
  };
  requestActions: {
    approve: string;
    reject: string;
    postpone: string;
    confirmApproval: string;
    confirmRejection: string;
    cancelApproval: string;
    cancelRejection: string;
    finishDelivery: string;
    startWork: string;
    finishWork: string;
    confirmReceipt: string;
    rejectReceipt: string;
    edit: string;
    archive: string;
    restore: string;
    // Written by the system when a postponed request comes back on its own.
    resurface: string;
    view: string;
    print: string;
  };
  requestModals: {
    approveTitle: string;
    rejectTitle: string;
    postponeTitle: string;
    confirmApprovalTitle: string;
    confirmRejectionTitle: string;
    cancelApprovalTitle: string;
    cancelRejectionTitle: string;
    rejectReceiptTitle: string;
    rejectReceiptDesc: string;
    commentLabel: string;
    commentOptional: string;
    commentPlaceholder: string;
    postponeUntilLabel: string;
    reasonRequired: string;
    dateRequired: string;
    editLines: string;
    removeLine: string;
    restoreLine: string;
    keepOneLine: string;
  };
  requestCard: {
    editNoteActive: string;
    editNoteExpired: string;
    postponeResurfaceNote: string;
    returnedBySenior: string;
    lineQuantityChanged: string;
    lineQuantityChangedNoActor: string;
    linesRemoved: string;
    linesRestored: string;
    deliveryAttachments: string;
    systemActor: string;
    archivedNote: string;
    pendingTab: string;
    reviewTab: string;
    archiveTab: string;
  };
  // Keyed by the error code the backend sends (RequestWorkflowErrors), so a
  // refusal reads in the interface language instead of the developer English.
  // Indexed by string because the set grows server-side.
  requestErrors: Record<string, string>;
  requestDelivery: {
    title: string;
    description: string;
    searchPlaceholder: string;
    selectedCount: string;
    availableStock: string;
    remaining: string;
    attachmentsHint: string;
    addAttachment: string;
    noAttachments: string;
    removeAttachment: string;
    attachmentsFailed: string;
    notesLabel: string;
    notesPlaceholder: string;
    noItems: string;
    submit: string;
    atLeastOne: string;
  };
  warehouseRequests: {
    title: string;
    addNew: string;
    searchPlaceholder: string;
    pendingTab: string;
    allTab: string;
    mineTab: string;
    noResults: string;
    columnRequester: string;
    columnDepartment: string;
    columnStatus: string;
    columnSuggestedStart: string;
    startWorkNotice: string;
    statusFilterAll: string;
    cardTitle: string;
    cardOpen: string;
    activityTitle: string;
    notesLabel: string;
    addLine: string;
    quantityRequestedLabel: string;
    quantityIssuedLabel: string;
    reasonLabel: string;
    itemLabel: string;
    categoryLabel: string;
    roomLabel: string;
    stepDeptType: string;
    stepItems: string;
    stepAttachments: string;
    nextStep: string;
    prevStep: string;
    finishStep: string;
    addCustomRequest: string;
    customRequestPlaceholder: string;
    describeCustomRequest: string;
    backToItems: string;
    attachmentsHint: string;
    addAttachment: string;
    noAttachments: string;
    removeAttachment: string;
    attachmentsFailed: string;
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
  costs: {
    title: string;
    total: string;
    byDepartment: string;
    byRequester: string;
    department: string;
    requester: string;
    amount: string;
    from: string;
    to: string;
    apply: string;
    note: string;
    reportTitle: string;
  };
  faultTypes: {
    title: string;
    addNew: string;
    nameArLabel: string;
    nameEnLabel: string;
    nameHiLabel: string;
    suggestedCategoryLabel: string;
    save: string;
  };
  maintenanceRequests: {
    title: string;
    addNew: string;
    searchPlaceholder: string;
    pendingTab: string;
    allTab: string;
    mineTab: string;
    noResults: string;
    columnRequester: string;
    columnDepartment: string;
    columnFaultType: string;
    columnPriority: string;
    columnStatus: string;
    columnSuggestedStart: string;
    startWorkNotice: string;
    statusFilterAll: string;
    cardTitle: string;
    cardOpen: string;
    activityTitle: string;
    departmentLabel: string;
    roomLabel: string;
    faultTypeLabel: string;
    locationLabel: string;
    priorityLabel: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    attachmentsHint: string;
    addAttachment: string;
    attachmentsFailed: string;
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
    viewImage: string;
    download: string;
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
    platformNameEnLabel: string;
    platformNameHiLabel: string;
    platformNamePlaceholder: string;
    schoolNameLabel: string;
    schoolNameEnLabel: string;
    schoolNameHiLabel: string;
    translationsLabel: string;
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
    presetTeal: string;
    presetBurgundy: string;
    presetSunset: string;
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
    holidaysTitle: string;
    holidaysHint: string;
    holidayDateLabel: string;
    holidayNameLabel: string;
    holidayNamePlaceholder: string;
    addHoliday: string;
    noHolidays: string;
    removeHoliday: string;
    holidaySaved: string;
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
    editTitle: string;
    saveChanges: string;
    delete: string;
    deleteConfirm: string;
    searchPlaceholder: string;
    search: string;
    filterAllDepartments: string;
    noResults: string;
    roomNumberLabel: string;
    nameArLabel: string;
    nameEnLabel: string;
    nameHiLabel: string;
    buildingLabel: string;
    floorLabel: string;
    departmentLabel: string;
    custodianLabel: string;
    assetCountLabel: string;
    save: string;
  };
  assets: {
    title: string;
    addNew: string;
    searchPlaceholder: string;
    search: string;
    filterAllCategories: string;
    filterAllRooms: string;
    filterAllStatuses: string;
    noResults: string;
    columnImage: string;
    columnAssetNumber: string;
    columnName: string;
    columnCategory: string;
    columnRoom: string;
    columnCustodian: string;
    columnStatus: string;
    assetNumberLabel: string;
    nameArLabel: string;
    nameEnLabel: string;
    nameHiLabel: string;
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
    depreciationRateLabel: string;
    accumulatedDepreciationLabel: string;
    periodEndBalanceLabel: string;
    periodEndDateLabel: string;
    editAsset: string;
    printSticker: string;
    close: string;
    transferLog: string;
    noTransfers: string;
    deleteAsset: string;
    saveChanges: string;
    photoUploadLabel: string;
    categoriesButton: string;
    categoriesTitle: string;
    categoriesDescription: string;
  };
  assetRequests: {
    title: string;
    addNew: string;
    searchPlaceholder: string;
    pendingTab: string;
    allTab: string;
    mineTab: string;
    cardTitle: string;
    cardOpen: string;
    activityTitle: string;
    noResults: string;
    columnRequester: string;
    columnAsset: string;
    columnStatus: string;
    columnSuggestedStart: string;
    startWorkNotice: string;
    statusFilterAll: string;
    assetLabel: string;
    departmentLabel: string;
    roomLabel: string;
    priorityLabel: string;
    priorityNormal: string;
    priorityUrgent: string;
    purposeLabel: string;
    purposePurchase: string;
    purposeMaintenance: string;
    purposeTransfer: string;
    destinationRoomLabel: string;
    pickCategories: string;
    pickAssets: string;
    pickTransferAssets: string;
    assetSearchPlaceholder: string;
    noMatchingAssets: string;
    quantityLabel: string;
    descriptionPlaceholder: string;
    attachmentsHint: string;
    addAttachment: string;
    noAttachments: string;
    removeAttachment: string;
    attachmentsFailed: string;
    requiredFields: string;
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
  assetAcquisitions: {
    title: string;
    addNew: string;
    editTitle: string;
    searchPlaceholder: string;
    allAssets: string;
    documentNumber: string;
    documentDate: string;
    vendor: string;
    assets: string;
    addAsset: string;
    noAssets: string;
    amount: string;
    notes: string;
    save: string;
    delete: string;
    noResults: string;
    assetCount: string;
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
  // See lib/getBranding.ts's comment -- a 200-with-HTML cold-start response
  // used to reach res.json() and throw, crashing every page using this.
  try {
    const res = await fetch(`${API_URL}/i18n/dictionary?locale=${locale}`, {
      next: { revalidate: 60, tags: ["dictionary"] },
    });
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
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
