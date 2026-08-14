create table official_holiday (
    holiday_date date primary key,
    name varchar(200),
    created_at timestamptz not null default now()
);

insert into translation (key, value_ar, value_en, value_hi) values
    ('siteMaintenanceAdmin.holidaysTitle', 'الإجازات الرسمية', 'Official holidays', 'आधिकारिक छुट्टियां'),
    ('siteMaintenanceAdmin.holidaysHint', 'يتم تجاوز يوم الجمعة تلقائياً. أضف هنا الأعياد وأيام الإجازة الرسمية الأخرى.', 'Fridays are skipped automatically. Add feasts and other official days off here.', 'शुक्रवार अपने आप छोड़ दिया जाता है। त्योहार और अन्य आधिकारिक अवकाश यहां जोड़ें।'),
    ('siteMaintenanceAdmin.holidayDateLabel', 'تاريخ الإجازة', 'Holiday date', 'अवकाश की तारीख'),
    ('siteMaintenanceAdmin.holidayNameLabel', 'اسم الإجازة (اختياري)', 'Holiday name (optional)', 'अवकाश का नाम (वैकल्पिक)'),
    ('siteMaintenanceAdmin.holidayNamePlaceholder', 'مثال: إجازة عيد الفطر', 'Example: Eid al-Fitr holiday', 'उदाहरण: ईद-उल-फितर अवकाश'),
    ('siteMaintenanceAdmin.addHoliday', 'إضافة إلى الإجازات', 'Add holiday', 'अवकाश जोड़ें'),
    ('siteMaintenanceAdmin.noHolidays', 'لم تتم إضافة إجازات رسمية بعد.', 'No official holidays have been added.', 'अभी कोई आधिकारिक अवकाश नहीं जोड़ा गया है।'),
    ('siteMaintenanceAdmin.removeHoliday', 'حذف', 'Remove', 'हटाएं'),
    ('siteMaintenanceAdmin.holidaySaved', 'تم حفظ الإجازة الرسمية.', 'Official holiday saved.', 'आधिकारिक अवकाश सहेजा गया।'),
    ('warehouseRequests.startWorkNotice', 'سيبدأ العمل على هذا الطلب بتاريخ {date} (اليوم التالي لتقديم الطلب).', 'Work on this request will begin on {date} (the next day after submission).', 'इस अनुरोध पर काम {date} से शुरू होगा (जमा करने के अगले दिन)।'),
    ('maintenanceRequests.startWorkNotice', 'سيبدأ العمل على هذا الطلب بتاريخ {date} (اليوم التالي لتقديم الطلب).', 'Work on this request will begin on {date} (the next day after submission).', 'इस अनुरोध पर काम {date} से शुरू होगा (जमा करने के अगले दिन)।'),
    ('assetRequests.startWorkNotice', 'سيبدأ العمل على هذا الطلب بتاريخ {date} (اليوم التالي لتقديم الطلب).', 'Work on this request will begin on {date} (the next day after submission).', 'इस अनुरोध पर काम {date} से शुरू होगा (जमा करने के अगले दिन)।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
