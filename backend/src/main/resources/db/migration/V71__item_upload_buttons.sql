-- Upload button and empty-state text for the item form's image/PDF pickers,
-- matching the legacy app's .filebox controls.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.uploadImages', 'رفع صور', 'Upload Images', 'चित्र अपलोड करें'),
    ('warehouseItems.noImagesChosen', 'لم يتم اختيار صور', 'No images selected', 'कोई चित्र नहीं चुना गया'),
    ('warehouseItems.uploadPdf', 'رفع PDF', 'Upload PDF', 'PDF अपलोड करें'),
    ('warehouseItems.noPdfChosen', 'لم يتم اختيار ملف', 'No file selected', 'कोई फ़ाइल नहीं चुनी गई')
on conflict (key) do nothing;
