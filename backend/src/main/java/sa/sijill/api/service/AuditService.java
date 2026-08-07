package sa.sijill.api.service;

import java.util.UUID;
import org.springframework.stereotype.Service;
import sa.sijill.api.domain.AuditLog;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.AuditLogRepository;

/**
 * Must always be called from inside the same transaction as the action it
 * describes — never as a fire-and-forget side effect (docs/api-conventions.md
 * "Audit log writes").
 */
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(Employee actor, String action, String entityType, UUID entityId) {
        record(actor, action, entityType, entityId, null, null);
    }

    public void record(
            Employee actor, String action, String entityType, UUID entityId, String before, String after) {
        AuditLog entry = new AuditLog();
        entry.setActor(actor);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setBeforeState(before);
        entry.setAfterState(after);
        auditLogRepository.save(entry);
    }
}
