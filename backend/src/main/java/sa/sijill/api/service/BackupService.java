package sa.sijill.api.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
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
    public BackupSnapshot runBackup(BackupTrigger triggeredBy) {
        BackupSnapshot saved = captureSnapshot(triggeredBy);
        pruneOldSnapshots();
        return saved;
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
    // succeeded — and scheduleRestart() then exits the JVM shortly after,
    // since Hikari's pool and Hibernate's cached metadata are now stale
    // against whatever schema just replaced the old one; nothing short of a
    // fresh process reliably clears that (confirmed live: the app stayed up
    // but every DB-backed endpoint 500'd until manually restarted).
    public void restore(UUID snapshotId, Employee actor) {
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
            scheduleRestart();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.internal("Restore failed: " + e.getMessage());
        } finally {
            deleteQuietly(targetFile);
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
            scheduleRestart();
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

    // Exits the JVM shortly after this call, once the current HTTP response
    // has had time to flush to the client — Render restarts a web service's
    // container when its process exits, which is what actually clears the
    // stale Hikari pool / Hibernate metadata after an in-place schema swap.
    // Any other in-flight requests at that moment get dropped, an accepted
    // tradeoff: a restore already invalidates every other active session's
    // view of the database regardless of whether the process restarts.
    private void scheduleRestart() {
        Thread restarter = new Thread(
                () -> {
                    try {
                        Thread.sleep(3000);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    System.exit(0);
                },
                "post-restore-restart");
        restarter.setDaemon(false);
        restarter.start();
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

    private void runPgDump(Path outputFile) throws Exception {
        ProcessBuilder builder = new ProcessBuilder(
                "pg_dump",
                "-h", pgHost,
                "-p", pgPort,
                "-U", pgUsername,
                "-Fc",
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
    private void resetPublicSchema() throws Exception {
        ProcessBuilder builder = new ProcessBuilder(
                "psql",
                "-h", pgHost,
                "-p", pgPort,
                "-U", pgUsername,
                "-d", pgDatabase,
                "-v", "ON_ERROR_STOP=1",
                "-c", "drop schema public cascade; create schema public;");
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
