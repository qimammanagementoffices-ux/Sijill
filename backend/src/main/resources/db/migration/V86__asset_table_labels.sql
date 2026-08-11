insert into translation (key, value_ar, value_en, value_hi) values
    ('assets.searchPlaceholder', 'ابحث برقم الأصل أو الاسم أو المسؤول...', 'Search asset number, name, or custodian...', 'संपत्ति नंबर, नाम या प्रभारी खोजें...'),
    ('assets.search', 'بحث', 'Search', 'खोजें'),
    ('assets.filterAllCategories', 'كل الفئات', 'All categories', 'सभी श्रेणियाँ'),
    ('assets.filterAllRooms', 'كل القاعات', 'All rooms', 'सभी कमरे'),
    ('assets.filterAllStatuses', 'كل الحالات', 'All statuses', 'सभी स्थितियाँ')
on conflict (key) do nothing;
