package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.UUID;
import sa.sijill.api.domain.MaintenanceSetting;

public record MaintenanceDto(
        boolean enabled,
        String messageAr,
        String messageEn,
        String messageHi,
        UUID imageAttachmentId,
        String imageUrl,
        Instant reopenAt,
        int version) {

    public static MaintenanceDto from(MaintenanceSetting setting) {
        return new MaintenanceDto(
                setting.isEnabled(),
                setting.getMessageAr(),
                setting.getMessageEn(),
                setting.getMessageHi(),
                setting.getImageAttachment() == null ? null : setting.getImageAttachment().getId(),
                setting.getImageAttachment() == null ? null : setting.getImageAttachment().getUrl(),
                setting.getReopenAt(),
                setting.getVersion());
    }
}
