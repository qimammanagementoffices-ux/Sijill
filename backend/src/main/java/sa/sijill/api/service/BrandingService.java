package sa.sijill.api.service;

import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.BrandingSetting;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.repository.BrandingSettingRepository;
import sa.sijill.api.web.dto.BrandingDto;
import sa.sijill.api.web.dto.UpdateBrandingRequest;

@Service
public class BrandingService {

    private static final String DEFAULT_PRESET = "default";
    private static final String DEFAULT_COLOR = "#0f766e";

    private final BrandingSettingRepository brandingSettingRepository;
    private final AttachmentRepository attachmentRepository;

    public BrandingService(
            BrandingSettingRepository brandingSettingRepository, AttachmentRepository attachmentRepository) {
        this.brandingSettingRepository = brandingSettingRepository;
        this.attachmentRepository = attachmentRepository;
    }

    public BrandingSetting get() {
        return brandingSettingRepository.findById(Boolean.TRUE).orElseThrow();
    }

    @Transactional
    public BrandingSetting update(UpdateBrandingRequest request) {
        BrandingSetting setting = get();
        if (setting.getVersion() != request.version()) {
            throw new StaleVersionException(BrandingDto.from(setting));
        }
        validateColor(request.primaryColor());
        setting.setPreset(request.preset());
        setting.setPrimaryColor(request.primaryColor());
        setting.setLogoAttachment(resolveAttachment(request.logoAttachmentId()));
        return brandingSettingRepository.save(setting);
    }

    @Transactional
    public BrandingSetting reset() {
        BrandingSetting setting = get();
        setting.setPreset(DEFAULT_PRESET);
        setting.setPrimaryColor(DEFAULT_COLOR);
        setting.setLogoAttachment(null);
        return brandingSettingRepository.save(setting);
    }

    private Attachment resolveAttachment(UUID attachmentId) {
        if (attachmentId == null) return null;
        return attachmentRepository.findById(attachmentId).orElseThrow(() -> ApiException.validation(
                "Logo attachment not found", Map.of("logoAttachmentId", "does not exist")));
    }

    private void validateColor(String color) {
        if (color == null || !color.matches("^#[0-9a-fA-F]{6}$")) {
            throw ApiException.validation("Invalid color", Map.of("primaryColor", "must be a #RRGGBB hex color"));
        }
    }
}
