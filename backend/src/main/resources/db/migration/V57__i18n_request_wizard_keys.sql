-- See V55 for why this targets translation rather than translation_value.
insert into translation (key, value_ar, value_en) values
    ('warehouseRequests.itemLabel',       'الصنف',                          'Item'),
    ('warehouseRequests.categoryLabel',   'نوع الاحتياج (نوع واحد لكل طلب)', 'Request type (one per request)'),
    ('warehouseRequests.roomLabel',       'الغرفة (اختياري)',               'Room (optional)'),
    ('warehouseRequests.stepDeptType',    'القسم والنوع',                   'Dept & Type'),
    ('warehouseRequests.stepItems',       'الأصناف',                        'Items'),
    ('warehouseRequests.stepAttachments', 'المرفقات والإرسال',              'Attachments & Submit'),
    ('warehouseRequests.nextStep',        'التالي',                         'Next'),
    ('warehouseRequests.prevStep',        'السابق',                         'Previous'),
    ('warehouseRequests.finishStep',      'تم',                             'Done')
on conflict (key) do nothing;
