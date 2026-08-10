insert into translation_value (language_id, key, value)
select l.id, k.key, k.val
from language l
cross join (values
    ('warehouseRequests.itemLabel',        'الصنف',                'ar'),
    ('warehouseRequests.itemLabel',        'Item',                 'en'),
    ('warehouseRequests.categoryLabel',    'نوع الاحتياج (نوع واحد لكل طلب)', 'ar'),
    ('warehouseRequests.categoryLabel',    'Request type (one per request)',    'en'),
    ('warehouseRequests.roomLabel',        'الغرفة (اختياري)',     'ar'),
    ('warehouseRequests.roomLabel',        'Room (optional)',      'en'),
    ('warehouseRequests.stepDeptType',     'القسم والنوع',        'ar'),
    ('warehouseRequests.stepDeptType',     'Dept & Type',         'en'),
    ('warehouseRequests.stepItems',        'الأصناف',             'ar'),
    ('warehouseRequests.stepItems',        'Items',               'en'),
    ('warehouseRequests.stepAttachments',  'المرفقات والإرسال',   'ar'),
    ('warehouseRequests.stepAttachments',  'Attachments & Submit','en'),
    ('warehouseRequests.nextStep',         'التالي',              'ar'),
    ('warehouseRequests.nextStep',         'Next',                'en'),
    ('warehouseRequests.prevStep',         'السابق',              'ar'),
    ('warehouseRequests.prevStep',         'Previous',            'en'),
    ('warehouseRequests.finishStep',       'تم',                  'ar'),
    ('warehouseRequests.finishStep',       'Done',                'en')
) as k(key, val, lang)
where l.code = k.lang
on conflict do nothing;
