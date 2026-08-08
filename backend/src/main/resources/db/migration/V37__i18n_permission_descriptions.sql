-- permission.description (V2/V5/V21) was always a raw hardcoded English
-- string, never run through the translation system like everything else in
-- this app -- PermissionGrid.tsx showed it as-is regardless of locale, so
-- an Arabic-language admin saw English permission descriptions in the
-- create/edit employee forms. Moving descriptions into the translation
-- table instead, keyed as "permission.<key with dots replaced by
-- underscores>" (a literal dot-in-key like "wh.act.approve" would otherwise
-- nest 4 levels deep when getDictionary.ts unflattens by "." -- underscores
-- keep it a flat one-level lookup). Arabic text below matches the
-- reference site's own permission grid HTML exactly (user-provided).
insert into translation (key, value_ar, value_en, value_hi) values
    ('permission.emp_view', 'عرض قائمة الموظفين', 'View employee directory', 'कर्मचारी सूची देखें'),
    ('permission.emp_manage', 'إدارة الموظفين والصلاحيات', 'Create, edit, deactivate employees and assign permissions', 'कर्मचारियों और अनुमतियों का प्रबंधन करें'),
    ('permission.emp_structure', 'إدارة الأقسام والمسميات الوظيفية', 'Manage departments and job titles', 'विभागों और पदनामों का प्रबंधन करें'),
    ('permission.wh_view', 'عرض لوحة المستودع', 'View warehouse inventory', 'गोदाम डैशबोर्ड देखें'),
    ('permission.wh_qty', 'عرض الكميات والأرصدة المتاحة', 'Adjust warehouse quantities', 'उपलब्ध मात्रा और शेष देखें'),
    ('permission.wh_items', 'إضافة وتعديل الأصناف', 'Manage warehouse item catalogue', 'सामान जोड़ें और संपादित करें'),
    ('permission.wh_invoices', 'تسجيل فواتير الشراء', 'View warehouse purchase invoices', 'खरीद चालान दर्ज करें'),
    ('permission.wh_invoices_edit', 'تعديل وحذف فواتير الشراء', 'Create and edit warehouse purchase invoices', 'खरीद चालान संपादित और हटाएं'),
    ('permission.wh_costs', 'عرض لوحة التكاليف المالية', 'View warehouse costs', 'वित्तीय लागत डैशबोर्ड देखें'),
    ('permission.wh_request', 'تقديم طلب احتياج', 'Submit warehouse need requests', 'आवश्यकता अनुरोध सबमिट करें'),
    ('permission.wh_act_approve', 'اعتماد طلبات الاحتياج', 'Approve warehouse need requests', 'आवश्यकता अनुरोध स्वीकृत करें'),
    ('permission.wh_act_reject', 'رفض طلبات الاحتياج', 'Reject warehouse need requests', 'आवश्यकता अनुरोध अस्वीकार करें'),
    ('permission.wh_act_postpone', 'تأجيل طلبات الاحتياج', 'Postpone warehouse need requests', 'आवश्यकता अनुरोध स्थगित करें'),
    ('permission.wh_act_finish', 'إنهاء العمل (تسليم أصناف المستودع)', 'Finish/fulfill warehouse need requests', 'कार्य पूर्ण करें (सामान वितरण)'),
    ('permission.mt_view', 'عرض لوحة الصيانة', 'View maintenance data', 'रखरखाव डैशबोर्ड देखें'),
    ('permission.mt_request', 'تقديم طلب صيانة', 'Submit maintenance requests', 'रखरखाव अनुरोध सबमिट करें'),
    ('permission.mt_act_approve', 'اعتماد طلبات الصيانة', 'Approve maintenance requests', 'रखरखाव अनुरोध स्वीकृत करें'),
    ('permission.mt_act_reject', 'رفض طلبات الصيانة', 'Reject maintenance requests', 'रखरखाव अनुरोध अस्वीकार करें'),
    ('permission.mt_act_postpone', 'تأجيل طلبات الصيانة', 'Postpone maintenance requests', 'रखरखाव अनुरोध स्थगित करें'),
    ('permission.mt_act_start', 'بدء تنفيذ الصيانة', 'Start maintenance work', 'रखरखाव कार्य शुरू करें'),
    ('permission.mt_act_finish', 'إنهاء طلبات الصيانة', 'Finish maintenance requests', 'रखरखाव अनुरोध पूर्ण करें'),
    ('permission.as_view', 'عرض لوحة الأصول', 'View assets and rooms', 'संपत्ति डैशबोर्ड देखें'),
    ('permission.as_manage', 'إدارة الغرف والأصول', 'Manage assets and rooms', 'कमरों और संपत्तियों का प्रबंधन करें'),
    ('permission.as_request', 'تقديم طلب أصول', 'Submit asset requests', 'संपत्ति अनुरोध सबमिट करें'),
    ('permission.as_act_approve', 'اعتماد طلبات الأصول', 'Approve asset requests', 'संपत्ति अनुरोध स्वीकृत करें'),
    ('permission.as_act_reject', 'رفض طلبات الأصول', 'Reject asset requests', 'संपत्ति अनुरोध अस्वीकार करें'),
    ('permission.as_act_postpone', 'تأجيل طلبات الأصول', 'Postpone asset requests', 'संपत्ति अनुरोध स्थगित करें'),
    ('permission.as_act_finish', 'إنهاء طلبات الأصول', 'Finish asset requests', 'संपत्ति अनुरोध पूर्ण करें'),
    ('permission.sys_branding', 'إدارة الهوية وألوان المنصة', 'Manage branding/theme settings', 'ब्रांडिंग/थीम सेटिंग्स प्रबंधित करें'),
    ('permission.sys_backup', 'إدارة النسخ الاحتياطي والاستعادة', 'Manage backups and restores', 'बैकअप और पुनर्स्थापना प्रबंधित करें'),
    ('permission.sys_audit_view', 'عرض سجل التدقيق', 'View the audit log', 'ऑडिट लॉग देखें'),
    ('permission.sys_translations', 'إدارة الترجمات واللغات', 'Manage UI translation strings and languages', 'अनुवाद और भाषाएं प्रबंधित करें'),
    ('permission.sys_maintenance', 'إغلاق الموقع للصيانة وتجاوزه', 'Enable/disable site maintenance mode and bypass it while enabled', 'साइट रखरखाव मोड सक्षम/अक्षम करें'),

    -- Group + sub-group headings for PermissionGrid.tsx's two-tier layout
    -- (matches the reference site: one heading per key prefix, each split
    -- into "Pages & dashboards" vs "Approval actions" sub-lists).
    ('permission.group_emp', 'الموظفون والصلاحيات', 'Employees & permissions', 'कर्मचारी और अनुमतियां'),
    ('permission.group_wh', 'إدارة المستودع', 'Warehouse management', 'गोदाम प्रबंधन'),
    ('permission.group_mt', 'إدارة الصيانة', 'Maintenance management', 'रखरखाव प्रबंधन'),
    ('permission.group_as', 'إدارة الأصول', 'Asset management', 'संपत्ति प्रबंधन'),
    ('permission.group_sys', 'النظام', 'System', 'सिस्टम'),
    ('permission.subPages', 'صفحات ولوحات', 'Pages & dashboards', 'पृष्ठ और डैशबोर्ड'),
    ('permission.subActions', 'إجراءات الاعتماد', 'Approval actions', 'स्वीकृति कार्रवाइयां');
