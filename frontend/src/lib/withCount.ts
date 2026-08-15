/**
 * "الموظفون (15)" — the page title with how many records it covers.
 *
 * Takes the total from the paged response rather than the rows on screen, so
 * it reports the size of the whole result, not of the current page. Renders
 * the bare title until the first response arrives: a title that reads "(0)"
 * while loading claims the list is empty when nobody knows yet.
 */
export function withCount(title: string, page: { totalElements: number } | null | undefined) {
  return page ? `${title} (${page.totalElements})` : title;
}
