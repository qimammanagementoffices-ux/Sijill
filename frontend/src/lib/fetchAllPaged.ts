import { apiFetch } from "@/lib/apiClient";
import type { PagedResponse } from "@/lib/types";

export async function fetchAllPaged<T>(pathForPage: (page: number) => string): Promise<T[]> {
  const rows: T[] = [];
  let pageNumber = 0;
  let totalPages = 1;

  while (pageNumber < totalPages) {
    const page = await apiFetch<PagedResponse<T>>(pathForPage(pageNumber));
    rows.push(...page.content);
    totalPages = page.totalPages;
    pageNumber += 1;
  }

  return rows;
}
