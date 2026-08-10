-- The wizard's room dropdown was collected in the UI but had nowhere to go:
-- CreateNeedRequestRequest had no roomId and need_request had no column, so
-- the selection was silently dropped on submit. Nullable -- room stays
-- optional, exactly as the "الغرفة (اختياري)" label promises.
alter table need_request
    add column room_id uuid references room (id);

create index if not exists idx_need_request_room on need_request (room_id);

insert into translation_value (language_id, key, value)
select l.id, k.key, k.val
from language l
cross join (values
    ('warehouseRequests.attachmentsHint',   'أرفق صوراً أو عروض أسعار (اختياري)',       'ar'),
    ('warehouseRequests.attachmentsHint',   'Attach photos or quotes (optional)',        'en'),
    ('warehouseRequests.addAttachment',     'إضافة مرفق',                                'ar'),
    ('warehouseRequests.addAttachment',     'Add attachment',                            'en'),
    ('warehouseRequests.noAttachments',     'لا توجد مرفقات',                            'ar'),
    ('warehouseRequests.noAttachments',     'No attachments',                            'en'),
    ('warehouseRequests.removeAttachment',  'إزالة',                                     'ar'),
    ('warehouseRequests.removeAttachment',  'Remove',                                    'en'),
    ('warehouseRequests.backToItems',       'العودة إلى الأصناف',                        'ar'),
    ('warehouseRequests.backToItems',       'Back to items',                             'en'),
    ('warehouseRequests.attachmentsFailed', 'تم إنشاء الطلب لكن تعذّر رفع بعض المرفقات', 'ar'),
    ('warehouseRequests.attachmentsFailed', 'Request created, but some attachments failed to upload', 'en')
) as k(key, val, lang)
where l.code = k.lang
on conflict do nothing;
