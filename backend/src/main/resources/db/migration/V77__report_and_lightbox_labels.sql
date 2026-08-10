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
