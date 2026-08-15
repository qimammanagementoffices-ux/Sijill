package sa.sijill.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.ReviewPolicy;

public interface ReviewPolicyRepository extends JpaRepository<ReviewPolicy, Boolean> {}
