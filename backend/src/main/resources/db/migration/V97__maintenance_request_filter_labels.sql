insert into translation (key, value_ar, value_en, value_hi, version) values
    ('maintenanceRequests.searchPlaceholder', 'ابحث باسم مقدم الطلب أو العطل أو الموقع...', 'Search requester, fault or location...', 'अनुरोधकर्ता, खराबी या स्थान खोजें...'),
    ('maintenanceRequests.pendingTab', 'طلبات بانتظار الاعتماد', 'Pending approval', 'अनुमोदन लंबित'),
    ('maintenanceRequests.allTab', 'كل طلبات الصيانة', 'All maintenance requests', 'सभी रखरखाव अनुरोध'),
    ('maintenanceRequests.mineTab', 'طلباتي', 'My requests', 'मेरे अनुरोध')
on conflict (key) do nothing;
