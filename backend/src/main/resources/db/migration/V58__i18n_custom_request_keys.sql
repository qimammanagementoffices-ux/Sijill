-- See V55 for why this targets translation rather than translation_value.
insert into translation (key, value_ar, value_en) values
    ('warehouseRequests.addCustomRequest',         'إضافة طلب غير موجود بالقائمة', 'Add unlisted request'),
    ('warehouseRequests.customRequestPlaceholder', 'قم بكتابة طلب جديد بالتفصيل',  'Describe your request in detail')
on conflict (key) do nothing;
