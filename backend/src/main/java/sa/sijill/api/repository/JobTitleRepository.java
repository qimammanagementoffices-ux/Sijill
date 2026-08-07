package sa.sijill.api.repository;

import java.util.UUID;
import sa.sijill.api.domain.JobTitle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobTitleRepository extends JpaRepository<JobTitle, UUID> {}
