-- The need-request list is a stack of cards (legacy layout), not a table.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseRequests.cardTitle', 'طلب احتياج', 'Need Request', 'आवश्यकता अनुरोध'),
    ('warehouseRequests.cardOpen', 'عرض الطلب', 'Open Request', 'अनुरोध देखें')
on conflict (key) do nothing;
