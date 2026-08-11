insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseRequests.searchPlaceholder', 'ابحث باسم مقدم الطلب أو الملاحظات...', 'Search requester or notes...', 'अनुरोधकर्ता या नोट्स खोजें...'),
    ('warehouseRequests.pendingTab', 'طلبات بانتظار الاعتماد', 'Pending approval', 'अनुमोदन लंबित'),
    ('warehouseRequests.allTab', 'كل طلبات الاحتياج', 'All need requests', 'सभी आवश्यकता अनुरोध'),
    ('warehouseRequests.mineTab', 'طلباتي (احتياج)', 'My need requests', 'मेरे आवश्यकता अनुरोध'),
    ('assetRequests.searchPlaceholder', 'ابحث برقم الأصل أو مقدم الطلب...', 'Search asset number or requester...', 'संपत्ति नंबर या अनुरोधकर्ता खोजें...'),
    ('assetRequests.pendingTab', 'طلبات أصول بانتظار الاعتماد', 'Pending asset requests', 'लंबित संपत्ति अनुरोध'),
    ('assetRequests.allTab', 'كل طلبات الأصول', 'All asset requests', 'सभी संपत्ति अनुरोध'),
    ('assetRequests.mineTab', 'طلباتي (أصول)', 'My asset requests', 'मेरे संपत्ति अनुरोध'),
    ('assetRequests.cardTitle', 'نقل أصل', 'Asset transfer', 'संपत्ति स्थानांतरण'),
    ('assetRequests.cardOpen', 'عرض النموذج', 'View form', 'फ़ॉर्म देखें'),
    ('assetRequests.activityTitle', 'سجل الإجراءات', 'Activity history', 'गतिविधि इतिहास')
on conflict (key) do nothing;
