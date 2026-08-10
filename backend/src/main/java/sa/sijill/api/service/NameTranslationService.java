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

    // The third language is Hindi. The field/param is still called "ur" across
    // the API and DB columns (name_ur, sourceLang "ur"); only the code sent to
    // Google was ever meant to name a real language, and "ur" gave Urdu.
    private static final String THIRD_LANG = "hi";

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
        String ur = request.text();
        switch (request.sourceLang()) {
            case "ar" -> {
                en = googleTranslateClient.translate(request.text(), "ar", "en");
                ur = googleTranslateClient.translate(request.text(), "ar", THIRD_LANG);
            }
            case "en" -> {
                ar = googleTranslateClient.translate(request.text(), "en", "ar");
                ur = googleTranslateClient.translate(request.text(), "en", THIRD_LANG);
            }
            case "ur" -> {
                ar = googleTranslateClient.translate(request.text(), THIRD_LANG, "ar");
                en = googleTranslateClient.translate(request.text(), THIRD_LANG, "en");
            }
            default -> throw ApiException.validation(
                    "Unsupported sourceLang '" + request.sourceLang() + "'", Map.of("sourceLang", "must be ar, en, or ur"));
        }
        return new TranslateNameResponse(ar, en, ur);
    }
}
