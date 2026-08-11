insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.quickActionsTitle', 'إجراءات سريعة', 'Quick actions', 'त्वरित कार्य'),
    ('dashboard.assetRequestsShortcut', 'طلبات الأصول', 'Asset requests', 'संपत्ति अनुरोध'),
    ('dashboard.newAssetRequestShortcut', 'طلب أصل جديد', 'New asset request', 'नया संपत्ति अनुरोध'),
    ('dashboard.maintenanceNeedsShortcut', 'احتياجاتك اليوم', 'Your needs today', 'आज की आपकी ज़रूरतें'),
    ('dashboard.newMaintenanceRequestShortcut', 'طلب صيانة جديد', 'New maintenance request', 'नया रखरखाव अनुरोध')
on conflict (key) do nothing;
