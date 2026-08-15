-- The upload hint advertised a hard 2 MB limit, but the browser now compresses
-- oversized images and PDFs before sending. Telling users about a limit they no
-- longer hit only made them shrink files by hand.
update translation
set value_ar = 'إرفاق صورة أو ملف PDF — تُضغط الملفات الكبيرة تلقائيًا',
    value_en = 'Attach an image or PDF — large files are compressed automatically',
    value_hi = 'छवि या PDF संलग्न करें — बड़ी फ़ाइलें स्वतः संपीड़ित होती हैं'
where key = 'warehouseInvoices.attachmentsHint';
