-- See V55 for why this targets translation rather than translation_value.
insert into translation (key, value_ar, value_en) values
    ('assets.depreciationRateLabel',         'نسبة الإهلاك السنوية (%)',              'Annual Depreciation Rate (%)'),
    ('assets.accumulatedDepreciationLabel',  'مجمع الإهلاك',                          'Accumulated Depreciation'),
    ('assets.periodEndBalanceLabel',         'رصيد آخر الفترة',                       'Period End Balance'),
    ('assets.periodEndDateLabel',            'تاريخ آخر الفترة',                      'Period End Date'),
    ('assets.editAsset',                     'تعديل الصنف',                           'Edit Asset'),
    ('assets.printSticker',                  'طباعة ملصق',                            'Print Sticker'),
    ('assets.close',                         'إغلاق',                                 'Close'),
    ('assets.transferLog',                   'سجل مواقع الأصل',                       'Asset Location Log'),
    ('assets.noTransfers',                   'لم ينقل هذا الأصل من موقعه الأصلي بعد', 'This asset has not been transferred yet'),
    ('assets.deleteAsset',                   'حذف الأصل',                             'Delete Asset'),
    ('assets.saveChanges',                   'حفظ التغييرات',                         'Save Changes'),
    ('assets.photoUploadLabel',              'الصور (يمكن إضافة أكثر من صورة)',       'Photos (multiple allowed)')
on conflict (key) do nothing;
