-- Invoice form placeholders and the confirm shown before posting. The
-- warning is deliberate: an invoice moves stock and sets last purchase
-- price, and there is no edit or delete afterwards.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseInvoices.numberPlaceholder', 'مثال: INV-2026-001', 'e.g. INV-2026-001', 'उदाहरण: INV-2026-001'),
    ('warehouseInvoices.vendorPlaceholder', 'مثال: مؤسسة النور للقرطاسية', 'e.g. Al-Noor Stationery Est.', 'उदाहरण: अल-नूर स्टेशनरी'),
    ('warehouseInvoices.postConfirm', 'الرجاء مراجعة الفاتورة جيدًا، لا يمكن التعديل أو الحذف بعد حفظ الفاتورة.', 'Please review the invoice carefully — it cannot be edited or deleted once saved.', 'कृपया चालान की सावधानीपूर्वक समीक्षा करें — सहेजने के बाद इसे संपादित या हटाया नहीं जा सकता।'),
    ('common.rowsPerPage', 'عدد النتائج', 'Rows per page', 'प्रति पृष्ठ पंक्तियाँ')
on conflict (key) do nothing;
