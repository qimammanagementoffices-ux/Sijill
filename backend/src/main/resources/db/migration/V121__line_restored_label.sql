-- A counter-signer can now put back a line the first-level official dropped.
-- The server records that as a line edit whose before and after quantities
-- match, and the card needs a sentence for it.

insert into translation (key, value_ar, value_en, value_hi) values
    ('requestCard.linesRestored',
     'تمت إعادة الأصناف: {items}',
     'Restored items: {items}',
     'पुनर्स्थापित वस्तुएँ: {items}')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
