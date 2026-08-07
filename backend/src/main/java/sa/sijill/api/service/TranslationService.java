package sa.sijill.api.service;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Translation;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.TranslationRepository;
import sa.sijill.api.web.dto.TranslationDto;
import sa.sijill.api.web.dto.UpdateTranslationRequest;

@Service
public class TranslationService {

    private final TranslationRepository translationRepository;

    public TranslationService(TranslationRepository translationRepository) {
        this.translationRepository = translationRepository;
    }

    /** Unknown locale returns an empty map rather than an error — frontend falls back to raw keys. */
    public Map<String, String> getDictionary(String locale) {
        Map<String, String> result = new LinkedHashMap<>();
        for (Translation t : translationRepository.findAll()) {
            String value = switch (locale) {
                case "ar" -> t.getValueAr();
                case "en" -> t.getValueEn();
                case "hi" -> t.getValueHi();
                default -> null;
            };
            if (value != null) {
                result.put(t.getKey(), value);
            }
        }
        return result;
    }

    public Page<Translation> search(String q, Pageable pageable) {
        return translationRepository.search(q, pageable);
    }

    @Transactional
    public Translation update(String key, UpdateTranslationRequest request) {
        Translation translation =
                translationRepository.findById(key).orElseThrow(() -> ApiException.notFound("Translation key not found"));
        if (translation.getVersion() != request.version()) {
            throw new StaleVersionException(TranslationDto.from(translation));
        }
        if (request.valueAr() == null || request.valueAr().isBlank() || request.valueEn() == null || request.valueEn().isBlank()) {
            throw ApiException.validation(
                    "Arabic and English values are required", Map.of("valueAr", "must not be blank"));
        }
        translation.setValueAr(request.valueAr());
        translation.setValueEn(request.valueEn());
        translation.setValueHi(request.valueHi());
        return translationRepository.save(translation);
    }
}
