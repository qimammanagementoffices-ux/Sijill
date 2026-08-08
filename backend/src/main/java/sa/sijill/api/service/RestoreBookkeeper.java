package sa.sijill.api.service;

import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.BackupSnapshot;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.BackupSnapshotRepository;

// Separate bean (not a method on BackupService) so @Transactional actually
// applies here — Spring's proxy-based transactions don't intercept
// self-invoked calls within the same class, and BackupService.restore()
// deliberately runs its pg_restore subprocess outside a transaction (see
// its own comment), so the post-restore bookkeeping needs a real external
// call to get proxied.
@Component
public class RestoreBookkeeper {

    private final BackupSnapshotRepository backupSnapshotRepository;
    private final AuditService auditService;

    public RestoreBookkeeper(BackupSnapshotRepository backupSnapshotRepository, AuditService auditService) {
        this.backupSnapshotRepository = backupSnapshotRepository;
        this.auditService = auditService;
    }

    @Transactional
    public void markRestored(UUID snapshotId, Employee actor) {
        BackupSnapshot target = backupSnapshotRepository
                .findById(snapshotId)
                .orElseThrow(() -> ApiException.notFound("Backup not found"));
        target.setRestoredAt(Instant.now());
        target.setRestoredBy(actor);
        backupSnapshotRepository.save(target);
        // No before/after state — PIN material and full DB content aren't
        // meaningful audit diff data, same convention as EmployeeService.resetPin.
        auditService.record(actor, "BACKUP_RESTORED", "BackupSnapshot", snapshotId);
    }
}
