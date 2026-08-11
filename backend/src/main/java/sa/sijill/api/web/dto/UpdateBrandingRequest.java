package sa.sijill.api.web.dto;

import java.util.UUID;

public record UpdateBrandingRequest(
        String preset,
        String primaryColor,
        String accentColor,
        String platformName,
        String platformNameEn,
        String platformNameHi,
        String schoolName,
        String schoolNameEn,
        String schoolNameHi,
        String schoolLabel,
        String subtitle,
        UUID logoAttachmentId,
        int version) {}
