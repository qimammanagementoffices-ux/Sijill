package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.NeedRequestAction;

public interface NeedRequestActionRepository extends JpaRepository<NeedRequestAction, UUID> {}
