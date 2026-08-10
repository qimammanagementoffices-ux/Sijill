-- The wizard's room dropdown was collected in the UI but had nowhere to go:
-- CreateNeedRequestRequest had no roomId and need_request had no column, so
-- the selection was silently dropped on submit. Nullable -- room stays
-- optional, exactly as the "الغرفة (اختياري)" label promises.
alter table need_request
    add column room_id uuid references room (id);

create index if not exists idx_need_request_room on need_request (room_id);

-- Built-in locales live in translation (V4) as value_ar/value_en/value_hi.
-- NOT the "insert into translation_value ... from language l" shape used by
-- V55-V58/V60 -- that table does not exist and language has no id column,
-- which is why Flyway currently dies at V55. See V9 for the correct shape.
insert into translation (key, value_ar, value_en) values
    ('warehouseRequests.attachmentsHint',   'أرفق صوراً أو عروض أسعار (اختياري)',        'Attach photos or quotes (optional)'),
    ('warehouseRequests.addAttachment',     'إضافة مرفق',                                 'Add attachment'),
    ('warehouseRequests.noAttachments',     'لا توجد مرفقات',                             'No attachments'),
    ('warehouseRequests.removeAttachment',  'إزالة',                                      'Remove'),
    ('warehouseRequests.backToItems',       'العودة إلى الأصناف',                         'Back to items'),
    ('warehouseRequests.attachmentsFailed', 'تم إنشاء الطلب لكن تعذّر رفع بعض المرفقات',  'Request created, but some attachments failed to upload')
on conflict (key) do nothing;
