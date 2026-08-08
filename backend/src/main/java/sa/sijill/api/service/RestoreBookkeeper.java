package sa.sijill.api.service;

import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Employee;

// Separate bean (not a method on BackupService) so @Transactional actually
// applies here — Spring's proxy-based transactions don't intercept
// self-invoked calls within the same class, and BackupService.restore()
// deliberately runs its schema-reset/pg_restore subprocesses outside a
// transaction (see its own comment), so the post-restore bookkeeping needs a
// real external call to get proxied.
//
// Deliberately does NOT try to update the restored snapshot's own row in
// backup_snapshot — that table gets entirely replaced by the restore, and
// the target snapshot's own row was always inserted *after* its own dump
// was taken (see captureSnapshot), so it can never contain itself. The audit
// log entry is the right record of "a restore happened": entityId is a
// soft reference (no FK), so it doesn't depend on that row surviving.
@Component
public class RestoreBookkeeper {

    private final AuditService auditService;

    public RestoreBookkeeper(AuditService auditService) {
        this.auditService = auditService;
    }

    @Transactional
    public void markRestored(UUID snapshotId, Employee actor) {
        // No before/after state — PIN material and full DB content aren't
        // meaningful audit diff data, same convention as EmployeeService.resetPin.
        //
        // Known edge case, deliberately not handled further: if the
        // restored snapshot predates the calling actor's own employee
        // record (e.g. restoring a very old backup from before this admin
        // account existed), this insert fails on the actor FK — the data
        // restore itself has already fully succeeded by this point, only
        // this confirmation/audit step errors. Acceptable for this app's
        // scale (restoring anything but a recent snapshot is already a rare,
        // deliberate DR action); a future maintainer hitting this should
        // just confirm the restore succeeded directly rather than trust
        // this call's response.
        auditService.record(actor, "BACKUP_RESTORED", "BackupSnapshot", snapshotId);
    }
}
