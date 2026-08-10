-- The request wizard renders one card per WAREHOUSE category, and the UI
-- spec calls for four: قرطاسية, ضيافة, نظافة and أدوية ومعدات. The first
-- three came across in the legacy import (V61); the fourth had no rows in
-- the source system, so the card silently never appeared. Seeded here so
-- the wizard matches the spec.
--
-- Fixed id (not a UUIDv5 like V61's imported rows) so re-running is a
-- no-op; nothing references this category yet, so there is no FK to keep
-- deterministic.
insert into category (id, domain, name_ar, name_en, name_ur, icon)
values (
    '7c3f1a92-5d84-4b6e-9f21-8a4c6e0b3d57',
    'WAREHOUSE',
    'أدوية ومعدات',
    'Medicines & Equipment',
    'ادویات اور آلات',
    '💊'
)
on conflict do nothing;
