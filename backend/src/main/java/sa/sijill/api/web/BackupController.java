package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.BackupSnapshot;
import sa.sijill.api.domain.BackupTrigger;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.security.RestoreRateLimiter;
import sa.sijill.api.service.AuthService;
import sa.sijill.api.service.BackupService;
import sa.sijill.api.service.StorageService;
import sa.sijill.api.web.dto.BackupSnapshotDto;
import sa.sijill.api.web.dto.RestorePinConfirmationRequest;

// Restore (Phase 7): gated by the same sys.backup permission as the rest of
// this controller, plus a fresh PIN re-check and its own rate limit, since
// it's destructive. See BackupService.restore for the pre-restore safety
// snapshot / pg_restore / bookkeeping sequence.
@RestController
@RequestMapping("/api/v1/backups")
public class BackupController {

    private final BackupService backupService;
    private final StorageService storageService;
    private final AuthService authService;
    private final RestoreRateLimiter restoreRateLimiter;

    public BackupController(
            BackupService backupService,
            StorageService storageService,
            AuthService authService,
            RestoreRateLimiter restoreRateLimiter) {
        this.backupService = backupService;
        this.storageService = storageService;
        this.authService = authService;
        this.restoreRateLimiter = restoreRateLimiter;
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

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('sys.backup')")
    public ResponseEntity<Void> restore(
            @PathVariable UUID id,
            @RequestBody RestorePinConfirmationRequest request,
            @AuthenticationPrincipal Employee actor) {
        if (!restoreRateLimiter.tryAcquire(actor.getId())) {
            throw ApiException.rateLimited("Too many restore attempts. Try again later.");
        }
        if (!authService.verifyPin(actor, request.pin())) {
            // 409, not 401: the session/JWT is fine, only the re-entered PIN
            // is wrong — apiClient.ts's frontend interceptor force-logs-out
            // on any 401 while a token is present, which would be the wrong
            // UX here (should show an inline retry, not kill the session).
            throw ApiException.conflict("Invalid PIN");
        }
        backupService.restore(id, actor);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('sys.backup')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        backupService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
