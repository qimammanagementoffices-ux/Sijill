package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.FaultType;

public interface FaultTypeRepository extends JpaRepository<FaultType, UUID> {}
