-- Item list filter bar: category, entry-date range, and the reset button.
-- lowStockOnly is relabelled to the legacy wording, which says what it is
-- for ("what needs ordering now") rather than describing the query.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.filterAllCategories', 'كل الفئات', 'All categories', 'सभी श्रेणियां'),
    ('warehouseItems.filterDateFrom', 'من', 'From', 'से'),
    ('warehouseItems.filterDateTo', 'إلى', 'To', 'तक'),
    ('warehouseItems.filterClear', 'مسح عوامل التصفية', 'Clear filters', 'फ़िल्टर साफ़ करें')
on conflict (key) do nothing;

update translation set value_ar = 'الأصناف المطلوبة الآن', value_en = 'Items needed now', value_hi = 'अभी आवश्यक सामान'
where key = 'warehouseItems.lowStockOnly';
