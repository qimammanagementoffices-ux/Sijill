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
    // before pulling the target dump down and running pg_restore against the
    // live database. The pg_restore subprocess deliberately runs outside any
    // single @Transactional scope — it opens its own libpq connection, not
    // one from the JPA/Hikari pool, and --clean will drop/recreate tables
    // (including employee) out from under any open JPA transaction. Only the
    // bookkeeping (marking the snapshot restored, the audit entry) needs a
    // transaction, and it's committed after the subprocess has already
    // succeeded.
    public void restore(UUID snapshotId, Employee actor) {
        BackupSnapshot target = get(snapshotId);
        captureSnapshot(BackupTrigger.PRE_RESTORE);

        Path tempFile;
        try {
            tempFile = Files.createTempFile("sijill-restore-", ".dump");
        } catch (Exception e) {
            throw ApiException.internal("Failed to create temp file for restore");
        }

        try {
            try (var stream = storageService.downloadPrivateFile(target.getStorageKey())) {
                Files.copy(stream, tempFile, StandardCopyOption.REPLACE_EXISTING);
            }
            runPgRestore(tempFile);
            restoreBookkeeper.markRestored(snapshotId, actor);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.internal("Restore failed: " + e.getMessage());
        } finally {
            try {
                Files.deleteIfExists(tempFile);
            } catch (Exception ignored) {
            }
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

    private void runPgRestore(Path inputFile) throws Exception {
        // -Fc dumps aren't restorable into a non-empty database without
        // --clean --if-exists (they don't wipe existing objects first) —
        // this drops and recreates every table, including employee, so the
        // caller's own session/PIN may no longer be valid afterward.
        ProcessBuilder builder = new ProcessBuilder(
                "pg_restore",
                "-h", pgHost,
                "-p", pgPort,
                "-U", pgUsername,
                "--clean",
                "--if-exists",
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
