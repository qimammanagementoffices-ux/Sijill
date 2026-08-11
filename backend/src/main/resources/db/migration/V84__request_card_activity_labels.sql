insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseRequests.activityTitle', 'سجل الإجراءات', 'Action history', 'कार्रवाई इतिहास'),
    ('maintenanceRequests.cardTitle', 'طلب صيانة', 'Maintenance Request', 'रखरखाव अनुरोध'),
    ('maintenanceRequests.cardOpen', 'عرض الطلب', 'Open Request', 'अनुरोध देखें'),
    ('maintenanceRequests.activityTitle', 'سجل الإجراءات', 'Action history', 'कार्रवाई इतिहास')
on conflict (key) do nothing;
