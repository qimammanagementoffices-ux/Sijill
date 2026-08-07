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
  publicAsset: {
    notFound: string;
  };
};

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
