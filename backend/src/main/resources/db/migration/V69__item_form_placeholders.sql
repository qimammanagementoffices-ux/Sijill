-- Example text for the item form's name and unit fields, matching the
-- placeholders the legacy app used. "الوحدة" also becomes "وحدة القياس",
-- the legacy label -- "unit" alone reads as a quantity, not a measure.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.namePlaceholder', 'مثال: أقلام سبورة', 'e.g. Whiteboard Markers', 'उदाहरण: व्हाइटबोर्ड मार्कर'),
    ('warehouseItems.unitPlaceholder', 'قطعة / علبة / كرتون...', 'piece / box / carton...', 'नग / डिब्बा / कार्टन...')
on conflict (key) do nothing;

update translation set value_ar = 'وحدة القياس', value_en = 'Unit of Measure', value_hi = 'माप की इकाई'
where key = 'warehouseItems.unitLabel';
