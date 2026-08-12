insert into translation (key, value_ar, value_en, value_hi) values
  ('common.search', 'بحث', 'Search', 'खोजें')
on conflict (key) do update set
  value_ar = excluded.value_ar,
  value_en = excluded.value_en,
  value_hi = excluded.value_hi,
  version = translation.version + 1;
