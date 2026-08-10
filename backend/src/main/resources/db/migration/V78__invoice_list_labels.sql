-- Purchase-invoice list: date-range filter, line-count column, and the
-- read-only invoice card opened by clicking a row. Invoices are immutable
-- (posting one moves stock and sets last purchase price), so the card has
-- no edit or delete action -- corrections are a new entry.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseInvoices.columnLineCount', 'عدد الأصناف', 'Items', 'सामान की संख्या'),
    ('warehouseInvoices.cardTitle', 'فاتورة الشراء', 'Purchase Invoice', 'खरीद चालान'),
    ('warehouseInvoices.filterDateFrom', 'من', 'From', 'से'),
    ('warehouseInvoices.filterDateTo', 'إلى', 'To', 'तक'),
    ('warehouseInvoices.filterClear', 'مسح عوامل التصفية', 'Clear filters', 'फ़िल्टर साफ़ करें')
on conflict (key) do nothing;
