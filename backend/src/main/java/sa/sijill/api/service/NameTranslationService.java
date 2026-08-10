package sa.sijill.api.service;

import java.util.Map;
import org.springframework.stereotype.Service;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.web.dto.TranslateNameRequest;
import sa.sijill.api.web.dto.TranslateNameResponse;

// Backs the "auto-translate" button on every bilingual/trilingual name
// field in the app (departments, job titles, categories, items, assets,
// rooms, fault types) -- one shared endpoint rather than duplicating this
// per entity.
@Service
public class NameTranslationService {

    private final GoogleTranslateClient googleTranslateClient;

    public NameTranslationService(GoogleTranslateClient googleTranslateClient) {
        this.googleTranslateClient = googleTranslateClient;
    }

    public TranslateNameResponse translate(TranslateNameRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            throw ApiException.validation("Text is required", Map.of("text", "must not be blank"));
        }
        String ar = request.text();
        String en = request.text();
        String hi = request.text();
        switch (request.sourceLang()) {
            case "ar" -> {
                en = googleTranslateClient.translate(request.text(), "ar", "en");
                hi = googleTranslateClient.translate(request.text(), "ar", "hi");
            }
            case "en" -> {
                ar = googleTranslateClient.translate(request.text(), "en", "ar");
                hi = googleTranslateClient.translate(request.text(), "en", "hi");
            }
            case "hi" -> {
                ar = googleTranslateClient.translate(request.text(), "hi", "ar");
                en = googleTranslateClient.translate(request.text(), "hi", "en");
            }
            default -> throw ApiException.validation(
                    "Unsupported sourceLang '" + request.sourceLang() + "'", Map.of("sourceLang", "must be ar, en, or hi"));
        }
        return new TranslateNameResponse(ar, en, hi);
    }
}
