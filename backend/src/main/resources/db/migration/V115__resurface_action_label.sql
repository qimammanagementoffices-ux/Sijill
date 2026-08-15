-- A postponed request returning to the queue is written by the system, not by
-- an employee, and had no label of its own -- the timeline printed the raw
-- "RESURFACE" in every language.
insert into translation (key, value_ar, value_en, value_hi) values
    ('requestActions.resurface', 'إعادة إلى قائمة الانتظار', 'Returned to the pending queue', 'लंबित सूची में लौटाया गया')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
