"use client";

// One footer for every paged table: page buttons on the right, rows-per-page
// on the left. In RTL the first child lands on the right, which is why the
// pagination comes first in source order -- space-between does the rest, and
// it mirrors correctly on an LTR locale without a second rule.
export default function TableFooter({
  page,
  totalPages,
  size,
  loadingPage,
  rowsPerPageLabel,
  onPage,
  onSize,
}: {
  page: number;
  totalPages: number;
  size: number;
  // Set while a page is being fetched, so the buttons lock instead of
  // queueing a second request.
  loadingPage?: number | null;
  rowsPerPageLabel: string;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const busy = loadingPage != null;
  return (
    <div className="table-foot no-print">
      <div className="table-foot-pages">
        {totalPages > 1 &&
          Array.from({ length: totalPages }, (_, i) => i).map((i) => (
            <button
              key={i}
              type="button"
              className={`btn btn-sm ${i === page ? "btn-primary" : "btn-outline"}`}
              onClick={() => onPage(i)}
              disabled={i === page || busy}
            >
              {i + 1}
            </button>
          ))}
      </div>
      <label className="table-foot-size">
        {rowsPerPageLabel}
        <select value={size} onChange={(e) => onSize(Number(e.target.value))} disabled={busy}>
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
