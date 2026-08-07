export type ExportColumn<T> = { header: string; value: (row: T) => string | number | null };

// Shared by every list screen's "Export XLSX" button (master spec §7:
// XLSX exports for inventory, invoices, rooms, assets, requests). Builds
// the workbook client-side from data already fetched into the browser —
// no backend export endpoint needed.
export async function exportToXlsx<T>(filename: string, sheetName: string, columns: ExportColumn<T>[], rows: T[]) {
  // Dynamically imported so exceljs's ~250KB isn't in every list page's
  // initial bundle — only loaded when export is actually clicked.
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.header, width: 20 }));
  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((c) => [c.header, c.value(row)])));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
