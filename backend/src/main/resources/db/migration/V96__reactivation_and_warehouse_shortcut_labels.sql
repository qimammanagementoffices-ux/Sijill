insert into translation (key, value_ar, value_en, value_hi) values
    ('employees.reactivate', 'إعادة التفعيل', 'Reactivate', 'पुनः सक्रिय करें'),
    ('employees.reactivateConfirm', 'هل تريد إعادة تفعيل هذا الموظف؟ سيتمكن من تسجيل الدخول بصلاحياته الحالية.', 'Reactivate this employee? They will be able to log in with their current permissions.', 'इस कर्मचारी को पुनः सक्रिय करें? वे अपनी वर्तमान अनुमतियों के साथ लॉग इन कर सकेंगे।'),
    ('dashboard.warehouseNeedsShortcut', 'طلبات الاحتياج', 'Need requests', 'आवश्यकता अनुरोध'),
    ('dashboard.newWarehouseRequestShortcut', 'طلب احتياج جديد', 'New need request', 'नया आवश्यकता अनुरोध')
on conflict (key) do update set
    value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi,
    version = translation.version + 1;
