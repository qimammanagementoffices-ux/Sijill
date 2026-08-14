alter table attachment drop constraint attachment_owner_type_check;
alter table attachment add constraint attachment_owner_type_check check (owner_type in
    ('INVENTORY_ITEM', 'ROOM', 'ASSET', 'BRANDING', 'MAINTENANCE', 'EMPLOYEE', 'NEED_REQUEST', 'ASSET_ACQUISITION', 'WAREHOUSE_INVOICE'));

insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseInvoices.attachmentsHint', 'إرفاق صورة أو ملف PDF — بحد أقصى 2 MB للملف', 'Attach an image or PDF — maximum 2 MB per file', 'छवि या PDF संलग्न करें — प्रति फ़ाइल अधिकतम 2 MB'),
    ('warehouseInvoices.attachmentsFailed', 'تم تسجيل الفاتورة لكن تعذّر رفع بعض المرفقات', 'The invoice was saved, but some attachments failed to upload', 'चालान सहेजा गया, लेकिन कुछ संलग्नक अपलोड नहीं हो सके')
on conflict (key) do nothing;
