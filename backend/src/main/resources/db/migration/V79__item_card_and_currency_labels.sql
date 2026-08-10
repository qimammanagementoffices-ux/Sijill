-- These keys were appended to V77 after it had already run in production.
-- Flyway records a file's checksum when it applies it, so editing V77
-- aborted startup with a mismatch -- and even without that, an applied
-- migration never runs again, so the appended statements would have been
-- silently skipped. They live here instead, where they will actually run.
--
-- V77 is back to the exact content that was applied; do not edit an
-- already-deployed migration again, add a new one.
insert into translation (key, value_ar, value_en, value_hi) values
    ('common.currency', 'ر.س', 'SAR', 'SAR'),
    ('warehouseItems.cardTax', 'الضريبة', 'Tax', 'कर'),
    ('warehouseItems.cardRequestDate', 'التاريخ', 'Date', 'तिथि'),
    ('warehouseItems.cardDepartment', 'القسم', 'Department', 'विभाग'),
    ('warehouseItems.quantityManualHint', '(تُحدَّث عادة تلقائيًا من الفواتير — عدّلها هنا فقط لتصحيح يدوي)', '(normally updated automatically from invoices — edit here only for a manual correction)', '(आम तौर पर चालान से स्वतः अपडेट होती है — यहाँ केवल मैन्युअल सुधार के लिए बदलें)')
on conflict (key) do nothing;
