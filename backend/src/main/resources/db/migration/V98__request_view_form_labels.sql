update translation
set value_ar = 'عرض النموذج', value_en = 'View form', value_hi = 'फ़ॉर्म देखें'
where key in (
    'assetRequests.cardOpen',
    'maintenanceRequests.cardOpen',
    'warehouseRequests.cardOpen'
);
