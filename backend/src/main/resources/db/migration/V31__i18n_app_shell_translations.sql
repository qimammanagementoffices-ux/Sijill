-- Visual redesign: new persistent sidebar/topbar shell (AppShell.tsx)
-- needs a sidebar brand title/tagline, a proper "Dashboard" nav label (the
-- sidebar used to (mis)reuse dashboard.welcomeMessage, which is "Welcome"
-- text, not a nav label), and an eyebrow heading above the admin-only nav
-- group.
insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.appName', 'سِجِلّ', 'Sijill', 'सिजिल'),
    ('dashboard.appTagline', 'إدارة المستودع والصيانة المدرسية', 'School warehouse & maintenance management', 'स्कूल गोदाम और रखरखाव प्रबंधन'),
    ('dashboard.dashboardNav', 'الرئيسية', 'Dashboard', 'डैशबोर्ड'),
    ('dashboard.adminEyebrow', 'الإدارة', 'Admin', 'व्यवस्थापक');
