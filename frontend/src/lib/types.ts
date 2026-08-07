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
