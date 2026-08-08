-- BrandingAdmin's Save button had no success feedback at all -- the
-- reference site shows a toast ("تم حفظ الهوية والألوان بنجاح") after
-- saving; this was missing entirely, not just unlocalized.
insert into translation (key, value_ar, value_en, value_hi) values
    ('branding.saveSuccess', 'تم حفظ الهوية والألوان بنجاح', 'Identity and colors saved successfully', 'पहचान और रंग सफलतापूर्वक सहेजे गए');
