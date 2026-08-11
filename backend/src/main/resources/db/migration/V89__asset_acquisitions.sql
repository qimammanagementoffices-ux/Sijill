create table asset_acquisition (
    id uuid primary key,
    document_number varchar(120) not null unique,
    document_date date not null,
    vendor varchar(255),
    amount numeric(14,2) not null default 0,
    notes text,
    version integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table asset_acquisition_asset (
    acquisition_id uuid not null references asset_acquisition(id) on delete cascade,
    asset_id uuid not null references asset(id),
    primary key (acquisition_id, asset_id)
);

create index idx_asset_acquisition_date on asset_acquisition(document_date);
create index idx_asset_acquisition_asset_asset on asset_acquisition_asset(asset_id);

alter table attachment drop constraint attachment_owner_type_check;
alter table attachment add constraint attachment_owner_type_check check (owner_type in
    ('INVENTORY_ITEM', 'ROOM', 'ASSET', 'BRANDING', 'MAINTENANCE', 'EMPLOYEE', 'NEED_REQUEST', 'ASSET_ACQUISITION'));

insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.assetAcquisitionsNav', 'فواتير وعقود الاقتناء', 'Acquisition invoices/contracts', 'अधिग्रहण चालान/अनुबंध'),
    ('assetAcquisitions.title', 'فاتورة / عقد الاقتناء', 'Acquisition Invoice / Contract', 'अधिग्रहण चालान / अनुबंध'),
    ('assetAcquisitions.addNew', 'إضافة فاتورة/عقد اقتناء', 'Add Acquisition Invoice/Contract', 'अधिग्रहण चालान/अनुबंध जोड़ें'),
    ('assetAcquisitions.editTitle', 'تعديل فاتورة/عقد الاقتناء', 'Edit Acquisition Invoice/Contract', 'अधिग्रहण चालान/अनुबंध संपादित करें'),
    ('assetAcquisitions.searchPlaceholder', 'ابحث بالرقم أو المورد أو الأصل...', 'Search number, vendor, or asset...', 'नंबर, विक्रेता या संपत्ति खोजें...'),
    ('assetAcquisitions.allAssets', 'كل الأصول', 'All assets', 'सभी संपत्तियाँ'),
    ('assetAcquisitions.documentNumber', 'رقم الفاتورة / العقد', 'Invoice / contract number', 'चालान / अनुबंध नंबर'),
    ('assetAcquisitions.documentDate', 'التاريخ', 'Date', 'तारीख'),
    ('assetAcquisitions.vendor', 'المورد / الجهة', 'Vendor / party', 'विक्रेता / पक्ष'),
    ('assetAcquisitions.assets', 'الأصول المرتبطة', 'Linked assets', 'लिंक की गई संपत्तियाँ'),
    ('assetAcquisitions.addAsset', 'اختر أصلًا لإضافته', 'Select an asset to add', 'जोड़ने के लिए संपत्ति चुनें'),
    ('assetAcquisitions.noAssets', 'لم تتم إضافة أصول بعد', 'No assets added yet', 'अभी कोई संपत्ति नहीं जोड़ी गई'),
    ('assetAcquisitions.amount', 'المبلغ الإجمالي', 'Total amount', 'कुल राशि'),
    ('assetAcquisitions.notes', 'ملاحظات', 'Notes', 'टिप्पणियाँ'),
    ('assetAcquisitions.save', 'حفظ', 'Save', 'सहेजें'),
    ('assetAcquisitions.delete', 'حذف', 'Delete', 'हटाएँ'),
    ('assetAcquisitions.noResults', 'لا توجد فواتير أو عقود اقتناء', 'No acquisition invoices or contracts', 'कोई अधिग्रहण चालान या अनुबंध नहीं'),
    ('assetAcquisitions.assetCount', 'عدد الأصول', 'Assets', 'संपत्तियाँ')
on conflict (key) do nothing;
