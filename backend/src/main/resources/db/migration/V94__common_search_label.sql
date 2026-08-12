INSERT INTO translation (translation_key, locale, value)
VALUES
  ('common.search', 'ar', 'بحث'),
  ('common.search', 'en', 'Search'),
  ('common.search', 'hi', 'खोजें')
ON CONFLICT (translation_key, locale) DO UPDATE SET value = EXCLUDED.value;
