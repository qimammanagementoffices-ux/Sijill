alter table asset_request alter column asset_id drop not null;
alter table asset_request add column department_id uuid references department(id);
alter table asset_request add column room_id uuid references room(id);
alter table asset_request add column destination_room_id uuid references room(id);
alter table asset_request add column purpose varchar(20);
alter table asset_request add column priority varchar(20);

alter table asset_request add constraint asset_request_purpose_check
    check (purpose is null or purpose in ('PURCHASE', 'MAINTENANCE', 'TRANSFER'));
alter table asset_request add constraint asset_request_priority_check
    check (priority is null or priority in ('NORMAL', 'URGENT'));

create table asset_request_line (
    id                  uuid primary key default gen_random_uuid(),
    asset_request_id    uuid not null references asset_request(id) on delete cascade,
    asset_id            uuid references asset(id),
    category_id         uuid references category(id),
    quantity            integer not null check (quantity > 0),
    check ((asset_id is not null and category_id is null) or (asset_id is null and category_id is not null))
);

create index idx_asset_request_line_request on asset_request_line(asset_request_id);
create index idx_asset_request_line_asset on asset_request_line(asset_id);
create index idx_asset_request_line_category on asset_request_line(category_id);

-- Preserve the original single-asset requests in the new line model while
-- leaving purpose null so their established custody-on-finish behavior stays intact.
insert into asset_request_line (asset_request_id, asset_id, quantity)
select id, asset_id, 1 from asset_request where asset_id is not null;

alter table attachment drop constraint attachment_owner_type_check;
alter table attachment add constraint attachment_owner_type_check check (owner_type in
    ('INVENTORY_ITEM', 'ROOM', 'ASSET', 'BRANDING', 'MAINTENANCE', 'EMPLOYEE', 'NEED_REQUEST',
     'ASSET_REQUEST', 'ASSET_ACQUISITION', 'WAREHOUSE_INVOICE'));

insert into translation (key, value_ar, value_en, value_hi) values
    ('assetRequests.addNew', 'طلب أصل جديد', 'New asset request', 'नया संपत्ति अनुरोध'),
    ('assetRequests.departmentLabel', 'القسم', 'Department', 'विभाग'),
    ('assetRequests.roomLabel', 'الغرفة', 'Room', 'कमरा'),
    ('assetRequests.priorityLabel', 'مستوى الأولوية', 'Priority', 'प्राथमिकता'),
    ('assetRequests.priorityNormal', 'عادي', 'Normal', 'सामान्य'),
    ('assetRequests.priorityUrgent', 'عاجل', 'Urgent', 'तत्काल'),
    ('assetRequests.purposeLabel', 'نوع الطلب', 'Request purpose', 'अनुरोध का उद्देश्य'),
    ('assetRequests.purposePurchase', 'شراء أصل جديد', 'Purchase new asset', 'नई संपत्ति खरीदें'),
    ('assetRequests.purposeMaintenance', 'صيانة أصل', 'Asset maintenance', 'संपत्ति रखरखाव'),
    ('assetRequests.purposeTransfer', 'نقل أصل بين الغرف', 'Transfer asset between rooms', 'कमरों के बीच संपत्ति स्थानांतरण'),
    ('assetRequests.destinationRoomLabel', 'الغرفة الجديدة (الوجهة)', 'New room (destination)', 'नया कमरा (गंतव्य)'),
    ('assetRequests.pickCategories', 'اختر فئة الأصل والكمية المطلوبة', 'Select the asset category and quantity needed', 'आवश्यक संपत्ति श्रेणी और मात्रा चुनें'),
    ('assetRequests.pickAssets', 'اختر الأصل أو الأصول المطلوب صيانتها', 'Select assets needing maintenance', 'रखरखाव की आवश्यकता वाली संपत्तियां चुनें'),
    ('assetRequests.pickTransferAssets', 'اختر الأصل أو الأصول المطلوب نقلها', 'Select assets to transfer', 'स्थानांतरित करने के लिए संपत्तियां चुनें'),
    ('assetRequests.assetSearchPlaceholder', 'ابحث برقم الأصل أو اسمه...', 'Search by asset number or name...', 'संपत्ति नंबर या नाम से खोजें...'),
    ('assetRequests.noMatchingAssets', 'لا توجد أصول مطابقة', 'No matching assets', 'कोई मेल खाती संपत्ति नहीं'),
    ('assetRequests.quantityLabel', 'الكمية', 'Quantity', 'मात्रा'),
    ('assetRequests.descriptionPlaceholder', 'مثال: طابعة بديلة لمكتب الإدارة، الحالية معطّلة...', 'Example: a replacement printer for the administration office...', 'उदाहरण: प्रशासन कार्यालय के लिए प्रतिस्थापन प्रिंटर...'),
    ('assetRequests.attachmentsHint', 'إرفاق صور أو ملف PDF (اختياري)', 'Attach images or a PDF (optional)', 'चित्र या PDF संलग्न करें (वैकल्पिक)'),
    ('assetRequests.addAttachment', 'إرفاق ملفات', 'Attach files', 'फ़ाइलें संलग्न करें'),
    ('assetRequests.noAttachments', 'لا توجد مرفقات', 'No attachments', 'कोई संलग्नक नहीं'),
    ('assetRequests.removeAttachment', 'إزالة', 'Remove', 'हटाएं'),
    ('assetRequests.attachmentsFailed', 'تم إرسال الطلب، لكن تعذّر رفع بعض المرفقات.', 'The request was submitted, but some attachments could not be uploaded.', 'अनुरोध भेज दिया गया, लेकिन कुछ संलग्नक अपलोड नहीं हो सके।'),
    ('assetRequests.requiredFields', 'أكمل الحقول المطلوبة واختر بنداً واحداً على الأقل.', 'Complete the required fields and select at least one item.', 'आवश्यक फ़ील्ड भरें और कम से कम एक आइटम चुनें।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
