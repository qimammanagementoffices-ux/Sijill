-- New permissions-overview matrix page (nav label + title) and the
-- per-module dashboard stat cards (warehouse/maintenance/assets), matching
-- the reference site's module landing pages.
insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.mainSectionsEyebrow', 'الأقسام الرئيسية', 'Main sections', 'मुख्य खंड'),
    ('dashboard.employeesGroupNav', 'الموظفون والصلاحيات', 'Employees & permissions', 'कर्मचारी और अनुमतियां'),
    ('dashboard.warehouseGroupNav', 'إدارة المستودع', 'Warehouse management', 'गोदाम प्रबंधन'),
    ('dashboard.maintenanceGroupNav', 'إدارة الصيانة', 'Maintenance management', 'रखरखाव प्रबंधन'),
    ('dashboard.assetsGroupNav', 'إدارة الأصول', 'Assets management', 'संपत्ति प्रबंधन'),
    ('dashboard.permissionsOverviewNav', 'نظرة عامة على الصلاحيات', 'Permissions overview', 'अनुमतियों का अवलोकन'),
    ('permissionsOverview.title', 'مصفوفة الصلاحيات — نظرة عامة', 'Permissions matrix — overview', 'अनुमति मैट्रिक्स — अवलोकन'),
    ('permissionsOverview.nav', 'نظرة عامة على الصلاحيات', 'Permissions overview', 'अनुमतियों का अवलोकन'),
    ('dashboardStats.warehouseTitle', 'إدارة المستودع', 'Warehouse management', 'गोदाम प्रबंधन'),
    ('dashboardStats.warehouseSubtitle', 'سجل تفصيلي لكل صنف، فواتير الشراء المرتبطة به، وطلبات الاحتياج التي صُرفت منه.', 'A detailed record of every item, its linked purchase invoices, and the need requests fulfilled from it.', 'हर आइटम, उससे जुड़े खरीद चालान, और उससे पूरी की गई आवश्यकता अनुरोधों का विस्तृत रिकॉर्ड।'),
    ('dashboardStats.warehouseItemCount', 'صنف مسجل', 'Registered items', 'पंजीकृत वस्तुएं'),
    ('dashboardStats.warehouseTotalQuantity', 'إجمالي الكميات المتاحة', 'Total quantity available', 'कुल उपलब्ध मात्रा'),
    ('dashboardStats.warehouseLowStock', 'أصناف منخفضة المخزون', 'Low-stock items', 'कम स्टॉक वाली वस्तुएं'),
    ('dashboardStats.warehousePendingRequests', 'طلبات بانتظار الاعتماد', 'Requests awaiting approval', 'स्वीकृति की प्रतीक्षा में अनुरोध'),
    ('dashboardStats.maintenanceTitle', 'إدارة الصيانة', 'Maintenance management', 'रखरखाव प्रबंधन'),
    ('dashboardStats.maintenanceSubtitle', 'تقديم بلاغات الصيانة ومتابعة حالتها أولاً بأول، مع لوحة متابعة لفريق الصيانة لاعتماد الطلبات وتنفيذها.', 'Submit maintenance reports and track their status live, with a follow-up board for the maintenance team to approve and carry out requests.', 'रखरखाव रिपोर्ट सबमिट करें और उनकी स्थिति को लाइव ट्रैक करें, रखरखाव टीम के लिए अनुरोधों को स्वीकृत और पूरा करने हेतु फॉलो-अप बोर्ड के साथ।'),
    ('dashboardStats.maintenanceOpen', 'طلبات مفتوحة', 'Open requests', 'खुले अनुरोध'),
    ('dashboardStats.maintenanceInProgress', 'جاري التنفيذ', 'In progress', 'प्रगति पर'),
    ('dashboardStats.maintenanceCompleted', 'مكتملة', 'Completed', 'पूर्ण'),
    ('dashboardStats.maintenanceUrgent', 'بلاغات عاجلة قائمة', 'Open urgent reports', 'खुली अत्यावश्यक रिपोर्ट'),
    ('dashboardStats.assetsTitle', 'إدارة الأصول', 'Assets management', 'संपत्ति प्रबंधन'),
    ('dashboardStats.assetsSubtitle', 'حصر كامل لأصول المدرسة الثابتة موزّعة على الغرف مع رمز QR لكل أصل، بالإضافة إلى طلبات احتياج أصول جديدة أو بديلة.', 'A full inventory of the school''s fixed assets distributed across rooms with a QR code for each asset, plus requests for new or replacement assets.', 'कमरों में वितरित स्कूल की स्थायी संपत्तियों की पूरी सूची, प्रत्येक संपत्ति के लिए QR कोड के साथ, साथ ही नई या प्रतिस्थापन संपत्ति के अनुरोध।'),
    ('dashboardStats.assetsRooms', 'الغرف المسجلة', 'Registered rooms', 'पंजीकृत कमरे'),
    ('dashboardStats.assetsAssets', 'الأصول المسجلة', 'Registered assets', 'पंजीकृत संपत्तियां'),
    ('dashboardStats.assetsPendingRequests', 'طلبات بانتظار الاعتماد', 'Requests awaiting approval', 'स्वीकृति की प्रतीक्षा में अनुरोध');
