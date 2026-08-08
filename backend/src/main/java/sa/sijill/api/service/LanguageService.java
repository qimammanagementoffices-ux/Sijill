package sa.sijill.api.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Language;
import sa.sijill.api.domain.Translation;
import sa.sijill.api.domain.TranslationExtraValue;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.LanguageRepository;
import sa.sijill.api.repository.TranslationExtraValueRepository;
import sa.sijill.api.repository.TranslationRepository;
import sa.sijill.api.web.dto.CreateLanguageRequest;

// Admin-addable languages beyond the three built-in ones (ar/en/hi — see
// decision-record.md D7 for why those stay as fixed columns on Translation,
// untouched by this). Adding a language always machine-translates every
// existing key from English via TranslationAiClient — there is no "add the
// language, translate later" path; a language with no values would just
// silently fall back to raw keys everywhere (see TranslationService's
// existing "unknown locale returns empty map" comment), which is worse
// than a slow synchronous create.
@Service
public class LanguageService {

    private static final Set<String> BUILT_IN_CODES = Set.of("ar", "en", "hi");
    private static final Set<String> VALID_DIRECTIONS = Set.of("ltr", "rtl");

    private final LanguageRepository languageRepository;
    private final TranslationRepository translationRepository;
    private final TranslationExtraValueRepository translationExtraValueRepository;
    private final TranslationAiClient translationAiClient;
    private final LanguagePersistence languagePersistence;

    public LanguageService(
            LanguageRepository languageRepository,
            TranslationRepository translationRepository,
            TranslationExtraValueRepository translationExtraValueRepository,
            TranslationAiClient translationAiClient,
            LanguagePersistence languagePersistence) {
        this.languageRepository = languageRepository;
        this.translationRepository = translationRepository;
        this.translationExtraValueRepository = translationExtraValueRepository;
        this.translationAiClient = translationAiClient;
        this.languagePersistence = languagePersistence;
    }

    public List<Language> list() {
        return languageRepository.findAll();
    }

    public List<TranslationExtraValue> values(String code) {
        get(code);
        return translationExtraValueRepository.findByLanguageCodeOrderByTranslationKey(code);
    }

    // Deliberately NOT @Transactional — an HTTP request to an external AI
    // provider taking up to ~2 minutes (see AnthropicTranslationAiClient's
    // timeout) has no business holding a DB transaction/connection open the
    // whole time. The Language row is inserted first (its own transaction,
    // via LanguagePersistence) so a failed translation leaves a
    // visible-but-empty language rather than nothing at all; the caller can
    // delete and retry rather than the create silently half-happening.
    public Language create(CreateLanguageRequest request) {
        String code = validateCode(request.code());
        String direction = validateDirection(request.direction());
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("name", "must not be blank"));
        }

        Language language = languagePersistence.insertLanguageRow(code, request, direction);

        Map<String, String> sourceEnglish = new LinkedHashMap<>();
        for (Translation t : translationRepository.findAll()) {
            sourceEnglish.put(t.getKey(), t.getValueEn());
        }
        Map<String, String> translated = translationAiClient.translateBatch(sourceEnglish, request.name());
        languagePersistence.saveValues(code, translated);
        return language;
    }

    @Transactional
    public void delete(String code) {
        Language language = get(code);
        translationExtraValueRepository.deleteByLanguageCode(code);
        languageRepository.delete(language);
    }

    @Transactional
    public TranslationExtraValue updateValue(String code, String key, String newValue) {
        get(code);
        if (newValue == null || newValue.isBlank()) {
            throw ApiException.validation("Value is required", Map.of("value", "must not be blank"));
        }
        TranslationExtraValue value = translationExtraValueRepository
                .findByTranslationKeyAndLanguageCode(key, code)
                .orElseThrow(() -> ApiException.notFound("No translated value for that key in this language"));
        value.setValue(newValue);
        return translationExtraValueRepository.save(value);
    }

    private Language get(String code) {
        return languageRepository.findById(code).orElseThrow(() -> ApiException.notFound("Language not found"));
    }

    private String validateCode(String code) {
        if (code == null || !code.matches("^[a-z]{2,10}$")) {
            throw ApiException.validation(
                    "Language code must be 2-10 lowercase letters", Map.of("code", "invalid format"));
        }
        if (BUILT_IN_CODES.contains(code)) {
            throw ApiException.validation(
                    "ar/en/hi are built in and can't be re-added", Map.of("code", "reserved"));
        }
        return code;
    }

    private String validateDirection(String direction) {
        if (direction == null || !VALID_DIRECTIONS.contains(direction)) {
            throw ApiException.validation("Direction must be 'ltr' or 'rtl'", Map.of("direction", "invalid"));
        }
        return direction;
    }
}
