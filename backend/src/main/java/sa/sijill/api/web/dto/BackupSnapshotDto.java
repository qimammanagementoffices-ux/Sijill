package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.UUID;
import sa.sijill.api.domain.BackupSnapshot;
import sa.sijill.api.domain.BackupTrigger;

public record BackupSnapshotDto(UUID id, String filename, long sizeBytes, BackupTrigger triggeredBy, Instant createdAt) {

    public static BackupSnapshotDto from(BackupSnapshot snapshot) {
        return new BackupSnapshotDto(
                snapshot.getId(),
                snapshot.getFilename(),
                snapshot.getSizeBytes(),
                snapshot.getTriggeredBy(),
                snapshot.getCreatedAt());
    }
}
