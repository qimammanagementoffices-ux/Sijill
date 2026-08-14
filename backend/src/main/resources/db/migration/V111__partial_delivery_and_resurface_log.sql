-- 1. Partial delivery. A short delivery used to close the request and abandon
--    the remainder; it now stays open in PARTIALLY_DELIVERED until the rest is
--    handed over or written off through cancel-remainder.
--    (No data change: no existing row can be in the new state.)

-- 2. Returning a postponed request to the queue is now a real status change
--    with a log entry, authored by the system rather than an employee.
alter table need_request_action alter column actor_employee_id drop not null;
alter table maintenance_request_action alter column actor_employee_id drop not null;
alter table asset_request_action alter column actor_employee_id drop not null;

-- 3. Proof-of-delivery attachments, kept apart from the requester's own
--    evidence so the card does not present them as the requester's.
alter table attachment drop constraint attachment_owner_type_check;
alter table attachment add constraint attachment_owner_type_check check (owner_type in
    ('INVENTORY_ITEM', 'ROOM', 'ASSET', 'BRANDING', 'MAINTENANCE', 'EMPLOYEE', 'NEED_REQUEST',
     'NEED_REQUEST_DELIVERY', 'ASSET_REQUEST', 'ASSET_ACQUISITION', 'WAREHOUSE_INVOICE'));

insert into translation (key, value_ar, value_en, value_hi) values
    ('requestStatus.PARTIALLY_DELIVERED', 'تم التسليم جزئيًا', 'Partially delivered', 'आंशिक रूप से वितरित'),

    ('requestActions.cancelRemainder', 'إغلاق الكمية المتبقية', 'Write off the remainder', 'शेष मात्रा बंद करें'),
    ('requestActions.deliverRemainder', 'تسليم المتبقي', 'Deliver the remainder', 'शेष मात्रा वितरित करें'),

    ('requestModals.cancelRemainderTitle', 'إغلاق الكمية المتبقية', 'Write off the remainder', 'शेष मात्रा बंद करें'),
    ('requestModals.cancelRemainderDesc', 'اذكر سبب عدم تسليم الكمية المتبقية. ستُعتمد الكميات المسلَّمة فعليًا نهائيًا، ولن يبقى الطلب مفتوحًا.', 'Explain why the remainder will not be delivered. The quantities actually handed over become final and the request stops waiting for the rest.', 'बताएं कि शेष मात्रा क्यों नहीं दी जाएगी। वास्तव में दी गई मात्राएँ अंतिम हो जाएँगी।'),

    ('requestCard.outstandingNotice', 'المتبقي من هذا الطلب: {items}', 'Still outstanding on this request: {items}', 'इस अनुरोध पर शेष: {items}'),
    ('requestCard.deliveryAttachments', 'إثبات التسليم', 'Proof of delivery', 'वितरण प्रमाण'),
    ('requestCard.systemActor', 'النظام', 'System', 'सिस्टम'),
    ('requestCard.lineQuantityChangedNoActor', 'تم تعديل {item} من {before} إلى {after}', '{item} changed from {before} to {after}', '{item} {before} से {after} किया गया'),

    ('requestDelivery.remaining', 'المتبقي: {qty}', 'Remaining: {qty}', 'शेष: {qty}'),
    ('requestDelivery.attachmentsHint', 'إرفاق صور أو ملف PDF (اختياري)', 'Attach images or a PDF (optional)', 'चित्र या PDF संलग्न करें (वैकल्पिक)'),
    ('requestDelivery.addAttachment', 'إرفاق ملفات', 'Attach files', 'फ़ाइलें संलग्न करें'),
    ('requestDelivery.noAttachments', 'لا توجد مرفقات', 'No attachments', 'कोई संलग्नक नहीं'),
    ('requestDelivery.removeAttachment', 'إزالة', 'Remove', 'हटाएं'),
    ('requestDelivery.attachmentsFailed', 'تم تسجيل التسليم، لكن تعذّر رفع بعض المرفقات.', 'The delivery was recorded, but some attachments could not be uploaded.', 'वितरण दर्ज हो गया, लेकिन कुछ संलग्नक अपलोड नहीं हो सके।'),

    ('requestErrors.NOTHING_OUTSTANDING', 'لا توجد كمية متبقية على هذا الطلب.', 'Nothing is outstanding on this request.', 'इस अनुरोध पर कुछ भी शेष नहीं है।'),

    ('assetRequests.archiveTab', 'الأرشيف', 'Archive', 'संग्रह')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
