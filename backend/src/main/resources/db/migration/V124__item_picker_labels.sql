-- The request form's item dropdown became a type-to-search list with the
-- item's photo beside each row: a catalogue is faster to search than to
-- scroll, and a storekeeper recognises the picture before the code.

insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseRequests.itemSearchPlaceholder',
     'ابحث بالاسم أو الرمز…',
     'Search by name or code…',
     'नाम या कोड से खोजें…'),
    ('warehouseRequests.noMatchingItems',
     'لا توجد أصناف مطابقة',
     'No matching items',
     'कोई मेल खाती वस्तु नहीं')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
