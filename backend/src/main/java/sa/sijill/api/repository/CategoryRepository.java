package sa.sijill.api.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.Domain;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByDomainAndActiveTrue(Domain domain);
}
