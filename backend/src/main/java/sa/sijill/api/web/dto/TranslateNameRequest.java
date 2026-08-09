package sa.sijill.api.web.dto;

// sourceLang: "ar" | "en" | "ur" -- which field the user just typed in.
// Generic -- shared by every bilingual-name form (departments, job titles,
// categories, items, assets, rooms, fault types).
public record TranslateNameRequest(String text, String sourceLang) {}
