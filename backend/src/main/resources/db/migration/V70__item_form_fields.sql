-- Fields the legacy add-item form had and this one did not: weight, the
-- warehouse entry date, opening quantity, and the image/PDF pickers.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.weightLabel', 'الوزن', 'Weight', 'वज़न'),
    ('warehouseItems.weightOptional', '(اختياري)', '(optional)', '(वैकल्पिक)'),
    ('warehouseItems.weightPlaceholder', 'مثال: 5 كغم', 'e.g. 5 kg', 'उदाहरण: 5 किलोग्राम'),
    ('warehouseItems.dateAddedLabel', 'تاريخ الإدخال للمستودع', 'Warehouse Entry Date', 'गोदाम में प्रवेश तिथि'),
    ('warehouseItems.initialQuantityLabel', 'الكمية الابتدائية', 'Initial Quantity', 'प्रारंभिक मात्रा'),
    ('warehouseItems.imagesLabel', 'الصور (يمكن إضافة أكثر من صورة)', 'Images (more than one may be added)', 'चित्र (एक से अधिक जोड़े जा सकते हैं)'),
    ('warehouseItems.pdfLabel', 'ملف PDF (اختياري — مواصفات، دليل استخدام...)', 'PDF file (optional — specifications, user manual...)', 'PDF फ़ाइल (वैकल्पिक — विनिर्देश, उपयोग मार्गदर्शिका...)')
on conflict (key) do nothing;
