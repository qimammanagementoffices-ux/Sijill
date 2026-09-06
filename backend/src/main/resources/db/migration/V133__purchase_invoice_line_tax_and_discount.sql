-- Per-line tax percentage and invoice-level discount for purchase invoices.
-- Existing invoice lines are backfilled with their parent invoice's tax rate
-- so historical invoice calculations and item purchase history remain truthful.

alter table purchase_invoice_line
    add column tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100);

update purchase_invoice_line l
set tax_rate = i.tax_rate
from purchase_invoice i
where l.invoice_id = i.id;

alter table purchase_invoice
    alter column tax_rate drop not null;

alter table purchase_invoice
    add column discount_type varchar(20) not null default 'FIXED' check (discount_type in ('FIXED', 'PERCENTAGE')),
    add column discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
    add column discount_total numeric(14,2) not null default 0 check (discount_total >= 0);

alter table purchase_invoice
    add constraint chk_purchase_invoice_total_non_negative check (total >= 0);

insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseInvoices.lineTaxLabel', 'الضريبة (%)', 'Tax (%)', 'कर (%)'),
    ('warehouseInvoices.discountLabel', 'الخصم', 'Discount', 'छूट'),
    ('warehouseInvoices.discountTypeFixed', 'مبلغ ثابت', 'Fixed amount', 'निश्चित राशि'),
    ('warehouseInvoices.discountTypePercentage', 'نسبة مئوية', 'Percentage', 'प्रतिशत'),
    ('warehouseInvoices.grossLabel', 'الإجمالي قبل الخصم', 'Gross before discount', 'छूट से पहले सकल'),
    ('warehouseInvoices.finalTotalLabel', 'الإجمالي النهائي', 'Final total', 'अंतिम कुल'),
    ('warehouseInvoices.mixedTax', 'متعدد', 'Mixed', 'मिश्रित'),
    ('warehouseInvoices.postConfirmTitle', 'تأكيد تسجيل الفاتورة', 'Confirm invoice posting', 'चालान दर्ज करने की पुष्टि करें'),
    ('warehouseInvoices.postConfirmAction', 'تأكيد وتسجيل', 'Confirm and post', 'पुष्टि करें और दर्ज करें'),
    ('warehouseInvoices.removeLine', 'حذف السطر', 'Remove line', 'पंक्ति हटाएं'),
    ('warehouseInvoices.close', 'إغلاق', 'Close', 'बंद करें'),
    ('warehouseInvoices.totalsAriaLabel', 'ملخص مجاميع الفاتورة', 'Invoice totals summary', 'चालान कुल सारांश'),
    ('warehouseInvoices.confirmDetails', 'تفاصيل الفاتورة', 'Invoice details', 'चालान विवरण'),
    ('warehouseInvoices.errorInvoiceNumberRequired', 'رقم الفاتورة مطلوب', 'Invoice number is required', 'चालान संख्या आवश्यक है'),
    ('warehouseInvoices.errorVendorRequired', 'اسم المورّد مطلوب', 'Vendor name is required', 'विक्रेता का नाम आवश्यक है'),
    ('warehouseInvoices.errorAtLeastOneLine', 'يجب إضافة صنف واحد على الأقل', 'At least one item line is required', 'कम से कम एक वस्तु पंक्ति आवश्यक है'),
    ('warehouseInvoices.errorQuantityPositiveInteger', 'الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر', 'Quantity must be a positive integer', 'मात्रा एक धनात्मक पूर्णांक होनी चाहिए'),
    ('warehouseInvoices.errorPriceNonNegative', 'السعر يجب أن يكون صفرًا أو أكثر', 'Price must be non-negative', 'कीमत गैर-ऋणात्मक होनी चाहिए'),
    ('warehouseInvoices.errorTaxRange', 'نسبة الضريبة يجب أن تكون بين 0 و 100', 'Tax rate must be between 0 and 100', 'कर की दर 0 और 100 के बीच होनी चाहिए'),
    ('warehouseInvoices.errorDiscountRange', 'نسبة الخصم يجب أن تكون بين 0 و 100', 'Discount percentage must be between 0 and 100', 'छूट का प्रतिशत 0 और 100 के बीच होना चाहिए'),
    ('warehouseInvoices.errorDiscountValueNonNegative', 'قيمة الخصم يجب ألا تكون سالبة', 'Discount value must be non-negative', 'छूट का मूल्य गैर-ऋणात्मक होना चाहिए'),
    ('warehouseInvoices.errorDiscountExceedsGross', 'قيمة الخصم لا يمكن أن تتجاوز الإجمالي', 'Discount cannot exceed gross amount', 'छूट सकल राशि से अधिक नहीं हो सकती')
on conflict (key) do update set
    value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
