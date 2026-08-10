-- Extra item-table columns from the legacy list: entry date, last purchase
-- price, and unit. "الاسم" also becomes "اسم الصنف", the legacy header.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.columnDateAdded', 'تاريخ الإدخال', 'Date Added', 'प्रवेश तिथि'),
    ('warehouseItems.columnLastPurchase', 'آخر شراء', 'Last Purchase', 'अंतिम खरीद'),
    ('warehouseItems.columnUnit', 'الوحدة', 'Unit', 'इकाई')
on conflict (key) do nothing;

update translation set value_ar = 'اسم الصنف', value_en = 'Item Name', value_hi = 'सामान का नाम'
where key = 'warehouseItems.columnName';
