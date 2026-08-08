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
    private static final String DEFAULT_ACCENT_COLOR = "#8B2635";

    private final BrandingSettingRepository brandingSettingRepository;
    private final AttachmentRepository attachmentRepository;
    private final AttachmentService attachmentService;

    public BrandingService(
            BrandingSettingRepository brandingSettingRepository,
            AttachmentRepository attachmentRepository,
            AttachmentService attachmentService) {
        this.brandingSettingRepository = brandingSettingRepository;
        this.attachmentRepository = attachmentRepository;
        this.attachmentService = attachmentService;
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
        validateColor(request.accentColor());

        UUID previousLogoId = setting.getLogoAttachment() == null ? null : setting.getLogoAttachment().getId();
        setting.setPreset(request.preset());
        setting.setPrimaryColor(request.primaryColor());
        setting.setAccentColor(request.accentColor());
        setting.setPlatformName(blankToNull(request.platformName()));
        setting.setSchoolName(blankToNull(request.schoolName()));
        setting.setSchoolLabel(blankToNull(request.schoolLabel()));
        setting.setSubtitle(blankToNull(request.subtitle()));
        setting.setLogoAttachment(resolveAttachment(request.logoAttachmentId()));
        BrandingSetting saved = brandingSettingRepository.save(setting);

        // Clear the old logo from storage once nothing references it —
        // otherwise every replaced logo just accumulates as an orphaned
        // object in the bucket forever.
        if (previousLogoId != null && !previousLogoId.equals(request.logoAttachmentId())) {
            attachmentService.delete(previousLogoId);
        }
        return saved;
    }

    @Transactional
    public BrandingSetting reset() {
        BrandingSetting setting = get();
        UUID previousLogoId = setting.getLogoAttachment() == null ? null : setting.getLogoAttachment().getId();
        setting.setPreset(DEFAULT_PRESET);
        setting.setPrimaryColor(DEFAULT_COLOR);
        setting.setAccentColor(DEFAULT_ACCENT_COLOR);
        setting.setPlatformName(null);
        setting.setSchoolName(null);
        setting.setSchoolLabel(null);
        setting.setSubtitle(null);
        setting.setLogoAttachment(null);
        BrandingSetting saved = brandingSettingRepository.save(setting);

        if (previousLogoId != null) {
            attachmentService.delete(previousLogoId);
        }
        return saved;
    }

    private Attachment resolveAttachment(UUID attachmentId) {
        if (attachmentId == null) return null;
        return attachmentRepository.findById(attachmentId).orElseThrow(() -> ApiException.validation(
                "Logo attachment not found", Map.of("logoAttachmentId", "does not exist")));
    }

    private void validateColor(String color) {
        if (color == null || !color.matches("^#[0-9a-fA-F]{6}$")) {
            throw ApiException.validation("Invalid color", Map.of("color", "must be a #RRGGBB hex color"));
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
