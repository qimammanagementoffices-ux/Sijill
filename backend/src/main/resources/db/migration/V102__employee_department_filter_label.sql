insert into translation (key, value_ar, value_en, value_hi) values
    ('employees.filterAllDepartments', 'كل الأقسام', 'All departments', 'सभी विभाग')
on conflict (key) do nothing;
