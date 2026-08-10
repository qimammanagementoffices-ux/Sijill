-- The maintenance-parts screen is the warehouse-items component against the
-- MAINTENANCE domain; without its own names it called itself "أصناف
-- المستودع". Only the screen-naming strings are overridden.
insert into translation (key, value_ar, value_en, value_hi) values
    ('maintenanceParts.title', 'مخزون قطع الصيانة', 'Maintenance Parts Stock', 'रखरखाव पुर्जों का भंडार'),
    ('maintenanceParts.reportTitle', 'تقرير مخزون قطع الصيانة', 'Maintenance Parts Stock Report', 'रखरखाव पुर्जों की भंडार रिपोर्ट'),
    ('maintenanceParts.addNew', 'إضافة قطعة', 'Add Part', 'पुर्जा जोड़ें'),
    ('maintenanceParts.noResults', 'لا توجد قطع', 'No parts', 'कोई पुर्जा नहीं'),
    ('maintenanceParts.categoriesTitle', 'فئات قطع الصيانة', 'Maintenance part categories', 'रखरखाव पुर्जा श्रेणियां'),
    ('maintenanceParts.categoriesDescription', 'هذه الفئات تصنّف قطع الصيانة. أضف فئة جديدة أو احذف فئة غير مستخدمة.', 'These categories classify maintenance parts. Add a new category or remove an unused one.', 'ये श्रेणियां रखरखाव पुर्जों को वर्गीकृत करती हैं। नई श्रेणी जोड़ें या अप्रयुक्त श्रेणी हटाएं।')
on conflict (key) do nothing;
