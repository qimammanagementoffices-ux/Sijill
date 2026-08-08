package sa.sijill.api.service;

import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Language;
import sa.sijill.api.domain.TranslationExtraValue;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.LanguageRepository;
import sa.sijill.api.repository.TranslationExtraValueRepository;
import sa.sijill.api.web.dto.CreateLanguageRequest;

// Separate bean (not methods on LanguageService) so @Transactional actually
// applies — Spring's proxy-based transactions don't intercept self-invoked
// calls within the same class, and LanguageService.create() deliberately
// keeps the AI translation HTTP call outside any transaction (see its own
// comment), so the DB steps around it need a real external call to get
// proxied. Same pattern as RestoreBookkeeper in Phase 7.
@Component
public class LanguagePersistence {

    private final LanguageRepository languageRepository;
    private final TranslationExtraValueRepository translationExtraValueRepository;

    public LanguagePersistence(
            LanguageRepository languageRepository,
            TranslationExtraValueRepository translationExtraValueRepository) {
        this.languageRepository = languageRepository;
        this.translationExtraValueRepository = translationExtraValueRepository;
    }

    @Transactional
    public Language insertLanguageRow(String code, CreateLanguageRequest request, String direction) {
        if (languageRepository.existsById(code)) {
            throw ApiException.validation("Language already exists", Map.of("code", "already in use"));
        }
        Language language = new Language();
        language.setCode(code);
        language.setName(request.name());
        language.setDirection(direction);
        return languageRepository.save(language);
    }

    // All-or-nothing so a language never ends up with only some of its keys
    // translated — if this throws partway, the whole batch rolls back and
    // the caller can delete the (still values-less) language and retry.
    @Transactional
    public void saveValues(String languageCode, Map<String, String> values) {
        for (Map.Entry<String, String> entry : values.entrySet()) {
            TranslationExtraValue value = new TranslationExtraValue();
            value.setTranslationKey(entry.getKey());
            value.setLanguageCode(languageCode);
            value.setValue(entry.getValue());
            translationExtraValueRepository.save(value);
        }
    }
}
