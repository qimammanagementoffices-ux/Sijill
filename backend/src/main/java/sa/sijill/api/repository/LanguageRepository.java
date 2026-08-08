package sa.sijill.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.Language;

public interface LanguageRepository extends JpaRepository<Language, String> {}
