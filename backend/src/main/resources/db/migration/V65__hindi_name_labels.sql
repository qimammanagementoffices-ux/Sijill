-- The third name field is Hindi, not Urdu (see i18n/config.ts). V50 and V55
-- labelled it "أردو / Urdu"; correct the visible label only -- the key name
-- and the name_ur columns stay as they are.
update translation set value_ar = 'الاسم (هندي)', value_en = 'Name (Hindi)', value_hi = 'नाम (हिन्दी)'
where key in ('categoriesModal.nameUrLabel', 'assets.nameUrLabel', 'rooms.nameUrLabel', 'faultTypes.nameUrLabel');
