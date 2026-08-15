-- The delivery modal no longer counts down a remainder across passes: a
-- delivery closes the request in one go, and each row opens at the quantity
-- the last official settled on. "المتبقي" described the old flow.
--
-- The key keeps its name (requestDelivery.remaining) so no code has to change
-- to read it; only what it says is wrong.

update translation
set value_ar = 'المعتمد: {qty}',
    value_en = 'Approved: {qty}',
    value_hi = 'स्वीकृत: {qty}'
where key = 'requestDelivery.remaining';
