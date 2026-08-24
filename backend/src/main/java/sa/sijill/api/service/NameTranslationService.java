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

    private final NameTranslationClient translationClient;

    public NameTranslationService(NameTranslationClient translationClient) {
        this.translationClient = translationClient;
    }

    public TranslateNameResponse translate(TranslateNameRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            throw ApiException.validation("Text is required", Map.of("text", "must not be blank"));
        }
        if (request.text().length() > 300) {
            throw ApiException.validation("Text is too long", Map.of("text", "must be at most 300 characters"));
        }
        String ar = request.text();
        String en = request.text();
        String hi = request.text();
        switch (request.sourceLang()) {
            case "ar" -> {
                en = translationClient.translate(request.text(), "ar", "en");
                hi = translationClient.translate(request.text(), "ar", "hi");
            }
            case "en" -> {
                ar = translationClient.translate(request.text(), "en", "ar");
                hi = translationClient.translate(request.text(), "en", "hi");
            }
            case "hi" -> {
                ar = translationClient.translate(request.text(), "hi", "ar");
                en = translationClient.translate(request.text(), "hi", "en");
            }
            default -> throw ApiException.validation(
                    "Unsupported sourceLang '" + request.sourceLang() + "'", Map.of("sourceLang", "must be ar, en, or hi"));
        }
        return new TranslateNameResponse(ar, en, hi);
    }
}
