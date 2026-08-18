package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.UUID;
import sa.sijill.api.domain.AuditLog;

public record AuditLogDto(
        UUID id,
        String actorName,
        String action,
        String entityType,
        UUID entityId,
        String beforeState,
        String afterState,
        Instant createdAt) {

    public static AuditLogDto from(AuditLog entry) {
        return new AuditLogDto(
                entry.getId(),
                entry.getActor() == null ? null : entry.getActor().getName(),
                entry.getAction(),
                entry.getEntityType(),
                entry.getEntityId(),
                entry.getBeforeState(),
                entry.getAfterState(),
                entry.getCreatedAt());
    }
}
