package sa.sijill.api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.TranslationExtraValue;

public interface TranslationExtraValueRepository extends JpaRepository<TranslationExtraValue, UUID> {

    List<TranslationExtraValue> findByLanguageCodeOrderByTranslationKey(String languageCode);

    Optional<TranslationExtraValue> findByTranslationKeyAndLanguageCode(String translationKey, String languageCode);

    void deleteByLanguageCode(String languageCode);
}
