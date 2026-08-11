package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.BrandingSetting;

public record BrandingDto(
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
        String logoUrl,
        int version) {

    public static BrandingDto from(BrandingSetting setting) {
        return new BrandingDto(
                setting.getPreset(),
                setting.getPrimaryColor(),
                setting.getAccentColor(),
                setting.getPlatformName(),
                setting.getPlatformNameEn(),
                setting.getPlatformNameHi(),
                setting.getSchoolName(),
                setting.getSchoolNameEn(),
                setting.getSchoolNameHi(),
                setting.getSchoolLabel(),
                setting.getSubtitle(),
                setting.getLogoAttachment() == null ? null : setting.getLogoAttachment().getId(),
                setting.getLogoAttachment() == null ? null : setting.getLogoAttachment().getUrl(),
                setting.getVersion());
    }
}
