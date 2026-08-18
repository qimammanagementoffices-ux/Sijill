package sa.sijill.api.repository;

import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByEntityTypeAndEntityId(String entityType, UUID entityId);

    @Override
    @EntityGraph(attributePaths = "actor")
    Page<AuditLog> findAll(Pageable pageable);
}
