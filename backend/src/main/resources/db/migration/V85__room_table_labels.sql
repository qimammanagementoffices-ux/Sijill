insert into translation (key, value_ar, value_en, value_hi) values
    ('rooms.searchPlaceholder', 'ابحث برقم أو اسم أو مبنى أو طابق...', 'Search number, name, building, or floor...', 'नंबर, नाम, भवन या मंजिल खोजें...'),
    ('rooms.search', 'بحث', 'Search', 'खोजें'),
    ('rooms.filterAllDepartments', 'كل الأقسام', 'All departments', 'सभी विभाग'),
    ('rooms.noResults', 'لا توجد غرف مطابقة', 'No matching rooms', 'कोई मेल खाता कमरा नहीं')
on conflict (key) do nothing;
