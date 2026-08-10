insert into translation_value (language_id, key, value)
select l.id, k.key, k.val
from language l
cross join (values
    ('warehouseRequests.addCustomRequest',        'إضافة طلب غير موجود بالقائمة', 'ar'),
    ('warehouseRequests.addCustomRequest',        'Add unlisted request',          'en'),
    ('warehouseRequests.customRequestPlaceholder','قم بكتابة طلب جديد بالتفصيل',  'ar'),
    ('warehouseRequests.customRequestPlaceholder','Describe your request in detail','en')
) as k(key, val, lang)
where l.code = k.lang
on conflict do nothing;
