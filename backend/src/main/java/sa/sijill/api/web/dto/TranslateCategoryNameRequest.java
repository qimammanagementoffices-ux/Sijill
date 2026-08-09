package sa.sijill.api.web.dto;

// sourceLang: "ar" | "en" | "ur" -- which field the user just typed in.
public record TranslateCategoryNameRequest(String text, String sourceLang) {}
