-- Phase 9 follow-up: the built-in ar/en/hi rows on /admin/languages had no
-- action at all -- their values are edited on the separate, pre-existing
-- /admin/translations grid (deliberately untouched by Phase 9, see
-- decision-record.md D7), but nothing linked the two pages together, which
-- read as "there's no table for changing language variables" from the UI.
insert into translation (key, value_ar, value_en, value_hi) values
    ('adminLanguages.editBuiltIn', 'تعديل الترجمات', 'Edit translations', 'अनुवाद संपादित करें');
