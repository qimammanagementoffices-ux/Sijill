package sa.sijill.api.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.BackupSnapshot;
import sa.sijill.api.domain.BackupTrigger;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.BackupSnapshotRepository;

// Shells out to pg_dump (added to the runtime image in Dockerfile) rather
// than reimplementing a dump format — custom format (-Fc) so it's directly
// usable with pg_restore later. Snapshots go to object storage under
// backups/, never via a public URL (see StorageService.uploadPrivateFile) —
// a dump contains PII and PIN hashes.
@Service
public class BackupService {

    private final BackupSnapshotRepository backupSnapshotRepository;
    private final StorageService storageService;
    private final RestoreBookkeeper restoreBookkeeper;
    private final String pgHost;
    private final String pgPort;
    private final String pgDatabase;
    private final String pgUsername;
    private final String pgPassword;
    private final int retentionDays;

    // Guards backup/restore so at most one runs at a time. Restore's
    // resetPublicSchema does a multi-step DDL dance (move backup_snapshot to
    // a scratch schema, drop/recreate public, move it back) — a concurrent
    // second restore (or even a "run backup now" mid-restore) interleaving
    // with that is exactly the kind of thing that can silently lose rows
    // without any individual SQL statement actually erroring, which is what
    // live testing showed. tryLock (not lock) so a second attempt gets an
    // immediate, clear rejection instead of silently queuing behind the
    // first — each of these is a deliberate one-at-a-time admin action, not
    // something that should ever be allowed to overlap.
    private final ReentrantLock backupLock = new ReentrantLock();

    public BackupService(
            BackupSnapshotRepository backupSnapshotRepository,
            StorageService storageService,
            RestoreBookkeeper restoreBookkeeper,
            @Value("${PGHOST}") String pgHost,
            @Value("${PGPORT}") String pgPort,
            @Value("${PGDATABASE}") String pgDatabase,
            @Value("${DATABASE_USERNAME}") String pgUsername,
            @Value("${DATABASE_PASSWORD}") String pgPassword,
            @Value("${app.backup.retention-days:30}") int retentionDays) {
        this.backupSnapshotRepository = backupSnapshotRepository;
        this.storageService = storageService;
        this.restoreBookkeeper = restoreBookkeeper;
        this.pgHost = pgHost;
        this.pgPort = pgPort;
        this.pgDatabase = pgDatabase;
        this.pgUsername = pgUsername;
        this.pgPassword = pgPassword;
        this.retentionDays = retentionDays;
    }

    public List<BackupSnapshot> list() {
        return backupSnapshotRepository.findAllByOrderByCreatedAtDesc();
    }

    public BackupSnapshot get(UUID id) {
        return backupSnapshotRepository.findById(id).orElseThrow(() -> ApiException.notFound("Backup not found"));
    }

    @Transactional
    public void delete(UUID id) {
        BackupSnapshot snapshot = get(id);
        storageService.delete(snapshot.getStorageKey());
        backupSnapshotRepository.delete(snapshot);
    }

    @Transactional
    public BackupSnapshot runBackup(BackupTrigger triggeredBy) {
        if (!backupLock.tryLock()) {
            throw ApiException.conflict("A backup or restore is already in progress. Try again shortly.");
        }
        try {
            BackupSnapshot saved = captureSnapshot(triggeredBy);
            pruneOldSnapshots();
            return saved;
        } finally {
            backupLock.unlock();
        }
    }

    // Restore is destructive, so it always takes a fresh safety snapshot of
    // the current (about-to-be-overwritten) state first, tagged PRE_RESTORE,
    // before resetting the schema and running pg_restore against the live
    // database (see resetPublicSchema/runPgRestore for why the schema is
    // reset rather than relying on pg_restore's own --clean). If pg_restore
    // itself then fails, the schema is already empty (resetPublicSchema
    // already committed as its own step) — recoverToPreRestoreState attempts
    // to restore the just-taken PRE_RESTORE snapshot rather than leave a live
    // database with zero tables. Both subprocesses deliberately run outside
    // any single @Transactional scope — they open their own libpq
    // connections, not one from the JPA/Hikari pool, and they replace the
    // schema (including employee) out from under any open JPA transaction.
    // Only the bookkeeping (marking the snapshot restored, the audit entry)
    // needs a transaction, committed after the subprocesses have already
    // succeeded.
    //
    // Deliberately does NOT try to self-restart the process afterward — an
    // earlier version called System.exit(0) here on the assumption Render
    // restarts a web service whose process exits, relying on Hikari's pool /
    // Hibernate's cached metadata being stale against the schema that just
    // replaced the old one. That assumption didn't hold up live: the process
    // exiting did not reliably bring the service back within any reasonable
    // window, turning "some endpoints error until a restart" into "the whole
    // app stuck down until someone manually restarts it in the Render
    // dashboard" — a worse failure mode than the one it was meant to fix.
    // Manually restarting sijill-api after a restore is now a documented
    // required step (docs/deployment-runbook.md §5) instead.
    public void restore(UUID snapshotId, Employee actor) {
        if (!backupLock.tryLock()) {
            throw ApiException.conflict("A backup or restore is already in progress. Try again shortly.");
        }
        try {
            BackupSnapshot target = get(snapshotId);
            BackupSnapshot preRestoreSnapshot = captureSnapshot(BackupTrigger.PRE_RESTORE);

            Path targetFile = createTempDumpFile("sijill-restore-");
            try {
                downloadTo(target, targetFile);
                resetPublicSchema();
                try {
                    runPgRestore(targetFile);
                } catch (Exception restoreFailure) {
                    recoverToPreRestoreState(preRestoreSnapshot, restoreFailure);
                    return;
                }
                restoreBookkeeper.markRestored(snapshotId, actor);
            } catch (ApiException e) {
                throw e;
            } catch (Exception e) {
                throw ApiException.internal("Restore failed: " + e.getMessage());
            } finally {
                deleteQuietly(targetFile);
            }
        } finally {
            backupLock.unlock();
        }
    }

    // Best-effort self-heal for when pg_restore fails after the schema has
    // already been reset — without this, a failed restore leaves the live
    // database with zero tables, which is a much worse outcome than the
    // failure that triggered it. Deliberately does NOT go through
    // RestoreBookkeeper/JPA here: by this point the schema has been reset at
    // least once already and may be mid-recovery, so this stays on plain
    // subprocess calls throughout and lets the caller's generic ApiException
    // handling report whichever error applies.
    private void recoverToPreRestoreState(BackupSnapshot preRestoreSnapshot, Exception originalFailure) {
        Path recoveryFile = createTempDumpFile("sijill-restore-recovery-");
        try {
            downloadTo(preRestoreSnapshot, recoveryFile);
            runPgRestore(recoveryFile);
            throw ApiException.internal(
                    "Restore failed and the database was automatically rolled back to its pre-restore state. Original error: "
                            + originalFailure.getMessage());
        } catch (ApiException e) {
            throw e;
        } catch (Exception recoveryFailure) {
            throw ApiException.internal("CRITICAL: restore failed and automatic recovery ALSO failed — the database"
                    + " may be left empty or inconsistent. Manually restore from the pre-restore snapshot ("
                    + preRestoreSnapshot.getId() + ") immediately. Original error: " + originalFailure.getMessage()
                    + " | Recovery error: " + recoveryFailure.getMessage());
        } finally {
            deleteQuietly(recoveryFile);
        }
    }

    private Path createTempDumpFile(String prefix) {
        try {
            return Files.createTempFile(prefix, ".dump");
        } catch (Exception e) {
            throw ApiException.internal("Failed to create temp file for restore");
        }
    }

    private void downloadTo(BackupSnapshot snapshot, Path destination) throws Exception {
        try (var stream = storageService.downloadPrivateFile(snapshot.getStorageKey())) {
            Files.copy(stream, destination, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (Exception ignored) {
        }
    }

    private BackupSnapshot captureSnapshot(BackupTrigger triggeredBy) {
        Path tempFile;
        try {
            tempFile = Files.createTempFile("sijill-backup-", ".dump");
        } catch (Exception e) {
            throw ApiException.internal("Failed to create temp file for backup");
        }

        try {
            runPgDump(tempFile);

            String storageKey = storageService.uploadPrivateFile(tempFile, "backups", "application/octet-stream");
            long sizeBytes = Files.size(tempFile);

            BackupSnapshot snapshot = new BackupSnapshot();
            snapshot.setStorageKey(storageKey);
            snapshot.setFilename("sijill-" + Instant.now().toEpochMilli() + ".dump");
            snapshot.setSizeBytes(sizeBytes);
            snapshot.setTriggeredBy(triggeredBy);
            return backupSnapshotRepository.save(snapshot);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.internal("Backup failed: " + e.getMessage());
        } finally {
            try {
                Files.deleteIfExists(tempFile);
            } catch (Exception ignored) {
            }
        }
    }

    // --exclude-table=public.backup_snapshot: backup history is deliberately
    // NOT part of what restore rolls back (D5, user's explicit choice) —
    // without this, every restore would make the backup list appear to lose
    // history that's actually still sitting safely in object storage. See
    // resetPublicSchema for the other half of this (preserving the live
    // backup_snapshot table's current rows across the reset).
    private void runPgDump(Path outputFile) throws Exception {
        ProcessBuilder builder = new ProcessBuilder(
                "pg_dump",
                "-h", pgHost,
                "-p", pgPort,
                "-U", pgUsername,
                "-Fc",
                "--exclude-table=public.backup_snapshot",
                "-f", outputFile.toAbsolutePath().toString(),
                pgDatabase);
        builder.environment().put("PGPASSWORD", pgPassword);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw ApiException.internal("pg_dump exited with code " + exitCode + ": " + output);
        }
    }

    // pg_restore's own --clean mode is not reliable here: its DROP
    // statements aren't CASCADE and don't reliably order themselves around
    // cross-table foreign keys — confirmed live in production, where it
    // failed trying to drop `employee` while a backup_snapshot FK still
    // referenced it (see decision-record.md D5). Resetting the schema first
    // and restoring into it empty sidesteps pg_restore's DROP-ordering
    // limitations entirely — the standard fix for "--clean fails on
    // cross-table foreign keys," not a one-off workaround, so it'll hold
    // even if new FKs are added later.
    //
    // backup_snapshot is parked in a scratch schema across the reset rather
    // than dropped with everything else — the dump being restored never
    // contains that table (runPgDump excludes it), so if we didn't preserve
    // it here, restore would leave the database with no backup_snapshot
    // table at all. Moving it out and back keeps its current rows (backup
    // history) intact and continuous across the restore, by design (D5):
    // restore rolls back application data, not the record of backups taken.
    //
    // Known edge case: a target dump taken *before* this exclusion existed
    // still contains its own backup_snapshot table/data. Restoring one of
    // those will fail when pg_restore tries to create a table that already
    // exists here — a clean, typed pg_restore failure, so it triggers the
    // usual self-heal rollback (recoverToPreRestoreState) rather than
    // corrupting anything. Ages out naturally as old snapshots expire past
    // the retention window.
    private void resetPublicSchema() throws Exception {
        ProcessBuilder builder = new ProcessBuilder(
                "psql",
                "-h", pgHost,
                "-p", pgPort,
                "-U", pgUsername,
                "-d", pgDatabase,
                "-v", "ON_ERROR_STOP=1",
                "-c",
                // Unconditionally clear any leftover restore_temp first —
                // belt-and-suspenders against a prior run that didn't clean
                // up after itself (backupLock above is the real fix for the
                // concurrent-restore case, this just makes a clean start
                // regardless of how a stale schema might have been left).
                "drop schema if exists restore_temp cascade; "
                        + "create schema restore_temp; "
                        + "alter table public.backup_snapshot set schema restore_temp; "
                        + "drop schema public cascade; "
                        + "create schema public; "
                        + "alter table restore_temp.backup_snapshot set schema public; "
                        + "drop schema restore_temp;");
        builder.environment().put("PGPASSWORD", pgPassword);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw ApiException.internal("Failed to reset schema before restore: exited with code " + exitCode + ": " + output);
        }
    }

    private void runPgRestore(Path inputFile) throws Exception {
        // --no-owner --no-privileges: the dump replays ALTER DEFAULT
        // PRIVILEGES/GRANT statements tied to whichever role originally
        // owned the database (Render's "postgres" superuser role), which
        // our own connected role can't execute — irrelevant anyway since
        // we're restoring into an already-provisioned database whose
        // ownership/grants don't need replaying.
        // --single-transaction: the schema is already empty (resetPublicSchema
        // ran first), so any failure here should roll back atomically rather
        // than leave a partially-restored database — no --clean/--if-exists
        // needed for the same reason.
        ProcessBuilder builder = new ProcessBuilder(
                "pg_restore",
                "-h", pgHost,
                "-p", pgPort,
                "-U", pgUsername,
                "--no-owner",
                "--no-privileges",
                "--single-transaction",
                "-d", pgDatabase,
                inputFile.toAbsolutePath().toString());
        builder.environment().put("PGPASSWORD", pgPassword);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw ApiException.internal("pg_restore exited with code " + exitCode + ": " + output);
        }
    }

    private void pruneOldSnapshots() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        List<BackupSnapshot> expired = backupSnapshotRepository.findByCreatedAtBefore(cutoff);
        for (BackupSnapshot snapshot : expired) {
            storageService.delete(snapshot.getStorageKey());
            backupSnapshotRepository.delete(snapshot);
        }
    }
}
