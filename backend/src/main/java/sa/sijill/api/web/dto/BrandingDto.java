package sa.sijill.api.web.dto;

import sa.sijill.api.domain.BrandingSetting;

public record BrandingDto(String preset, String primaryColor, String logoUrl, int version) {

    public static BrandingDto from(BrandingSetting setting) {
        return new BrandingDto(
                setting.getPreset(),
                setting.getPrimaryColor(),
                setting.getLogoAttachment() == null ? null : setting.getLogoAttachment().getUrl(),
                setting.getVersion());
    }
}
