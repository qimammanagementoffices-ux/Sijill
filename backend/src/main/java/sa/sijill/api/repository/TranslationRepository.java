package sa.sijill.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.Translation;

public interface TranslationRepository extends JpaRepository<Translation, String> {

    @Query("""
            select t from Translation t
            where (:q is null or :q = ''
                or lower(t.key) like lower(concat('%', :q, '%'))
                or lower(t.valueEn) like lower(concat('%', :q, '%'))
                or lower(t.valueAr) like lower(concat('%', :q, '%')))
            """)
    Page<Translation> search(@Param("q") String q, Pageable pageable);
}
