package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.UUID;

public record UpdateMaintenanceRequest(
        boolean enabled,
        String messageAr,
        String messageEn,
        String messageHi,
        UUID imageAttachmentId,
        Instant reopenAt,
        int version) {}
