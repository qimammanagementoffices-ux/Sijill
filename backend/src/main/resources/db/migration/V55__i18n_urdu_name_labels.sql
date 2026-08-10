-- Built-in locales live in translation (V4) as value_ar/value_en/value_hi.
-- This file previously inserted into translation_value, selecting l.id from
-- language: no migration creates that table, and language's PK is code with
-- no id column, so Flyway aborted here and every context-loading test died
-- with it. value_hi stays null (as it was before) -- TranslationService
-- returns null for an untranslated locale and the dictionary tolerates it.
insert into translation (key, value_ar, value_en) values
    ('assets.nameUrLabel',      'الاسم (أردو)',    'Name (Urdu)'),
    ('rooms.nameUrLabel',       'الاسم (أردو)',    'Name (Urdu)'),
    ('faultTypes.nameUrLabel',  'الاسم (أردو)',    'Name (Urdu)')
on conflict (key) do nothing;
