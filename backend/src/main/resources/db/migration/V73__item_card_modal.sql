-- The item card ("بطاقة الصنف") opened by clicking a row in the item list.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.cardTitle', 'بطاقة الصنف', 'Item Card', 'सामान कार्ड'),
    ('warehouseItems.cardBasicInfo', 'المعلومات الأساسية', 'Basic Information', 'बुनियादी जानकारी'),
    ('warehouseItems.cardPurchaseHistory', 'سجل المشتريات والفواتير', 'Purchase and Invoice History', 'खरीद और चालान इतिहास'),
    ('warehouseItems.cardNoPurchases', 'لا توجد فواتير شراء مسجلة لهذا الصنف بعد.', 'No purchase invoices recorded for this item yet.', 'इस सामान के लिए अभी तक कोई खरीद चालान दर्ज नहीं है।'),
    ('warehouseItems.cardRequestHistory', 'سجل طلبات الاحتياج على هذا الصنف', 'Need Request History for This Item', 'इस सामान के लिए आवश्यकता अनुरोध इतिहास'),
    ('warehouseItems.cardNoRequests', 'لم يُطلب هذا الصنف ضمن أي طلب احتياج بعد.', 'This item has not been included in any need request yet.', 'इस सामान को अभी तक किसी आवश्यकता अनुरोध में शामिल नहीं किया गया है।'),
    ('warehouseItems.cardInvoiceNumber', 'رقم الفاتورة', 'Invoice Number', 'चालान संख्या'),
    ('warehouseItems.cardVendor', 'المورّد', 'Vendor', 'विक्रेता'),
    ('warehouseItems.cardUnitPrice', 'سعر الوحدة', 'Unit Price', 'इकाई मूल्य'),
    ('warehouseItems.cardLineTotal', 'الإجمالي', 'Total', 'कुल'),
    ('warehouseItems.cardRequester', 'مقدّم الطلب', 'Requester', 'अनुरोधकर्ता'),
    ('warehouseItems.cardQuantityRequested', 'الكمية المطلوبة', 'Quantity Requested', 'अनुरोधित मात्रा'),
    ('warehouseItems.cardQuantityIssued', 'الكمية المصروفة', 'Quantity Issued', 'जारी मात्रा'),
    ('warehouseItems.cardEdit', 'تعديل الصنف', 'Edit Item', 'सामान संपादित करें')
on conflict (key) do nothing;
