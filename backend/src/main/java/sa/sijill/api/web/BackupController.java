package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.BackupSnapshot;
import sa.sijill.api.domain.BackupTrigger;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.service.BackupService;
import sa.sijill.api.service.StorageService;
import sa.sijill.api.web.dto.BackupSnapshotDto;

// No restore endpoint yet — deliberately deferred (restore is destructive
// and needs its own focused review: PIN re-auth, pre-restore snapshot,
// safe execution against the live database). See docs/decision-record.md
// discussion during Phase 6c for the reasoning.
@RestController
@RequestMapping("/api/v1/backups")
public class BackupController {

    private final BackupService backupService;
    private final StorageService storageService;

    public BackupController(BackupService backupService, StorageService storageService) {
        this.backupService = backupService;
        this.storageService = storageService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('sys.backup')")
    public List<BackupSnapshotDto> list() {
        return backupService.list().stream().map(BackupSnapshotDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('sys.backup')")
    public BackupSnapshotDto trigger() {
        return BackupSnapshotDto.from(backupService.runBackup(BackupTrigger.MANUAL));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAuthority('sys.backup')")
    public ResponseEntity<byte[]> download(@PathVariable UUID id) {
        BackupSnapshot snapshot = backupService.get(id);
        byte[] content;
        try (var stream = storageService.downloadPrivateFile(snapshot.getStorageKey())) {
            content = stream.readAllBytes();
        } catch (Exception e) {
            throw ApiException.internal("Failed to download backup");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("Content-Disposition", "attachment; filename=\"" + snapshot.getFilename() + "\"")
                .body(content);
    }
}
