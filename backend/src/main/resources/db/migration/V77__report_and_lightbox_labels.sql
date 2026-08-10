-- Printed report title, and the lightbox dialog's own wording (it used
-- hardcoded Arabic before, so it never followed the interface language).
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.reportTitle', 'تقرير سجل الأصناف', 'Item Register Report', 'सामान रजिस्टर रिपोर्ट'),
    ('attachments.viewImage', 'عرض الصورة', 'View Image', 'चित्र देखें'),
    ('attachments.download', 'تحميل', 'Download', 'डाउनलोड')
on conflict (key) do nothing;

-- Request-history columns on the item card, matching the legacy layout
-- (date, requester, department, quantity, status).
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.cardRequestDate', 'التاريخ', 'Date', 'तिथि'),
    ('warehouseItems.cardDepartment', 'القسم', 'Department', 'विभाग')
on conflict (key) do nothing;

-- Purchase-history columns match the legacy invoice table: quantity with
-- unit, unit price and total in riyals, tax as a percentage chip.
insert into translation (key, value_ar, value_en, value_hi) values
    ('common.currency', 'ر.س', 'SAR', 'SAR'),
    ('warehouseItems.cardTax', 'الضريبة', 'Tax', 'कर')
on conflict (key) do nothing;

-- Quantity is normally driven by invoices; the item edit dialog says so,
-- since a manual correction there is an exception, not the usual path.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.quantityManualHint', '(تُحدَّث عادة تلقائيًا من الفواتير — عدّلها هنا فقط لتصحيح يدوي)', '(normally updated automatically from invoices — edit here only for a manual correction)', '(आम तौर पर चालान से स्वतः अपडेट होती है — यहाँ केवल मैन्युअल सुधार के लिए बदलें)')
on conflict (key) do nothing;
