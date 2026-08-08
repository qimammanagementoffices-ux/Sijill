package sa.sijill.api.service;

import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.MaintenanceSetting;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.repository.MaintenanceSettingRepository;
import sa.sijill.api.web.dto.MaintenanceDto;
import sa.sijill.api.web.dto.UpdateMaintenanceRequest;

@Service
public class MaintenanceService {

    private final MaintenanceSettingRepository maintenanceSettingRepository;
    private final AttachmentRepository attachmentRepository;
    private final AttachmentService attachmentService;

    public MaintenanceService(
            MaintenanceSettingRepository maintenanceSettingRepository,
            AttachmentRepository attachmentRepository,
            AttachmentService attachmentService) {
        this.maintenanceSettingRepository = maintenanceSettingRepository;
        this.attachmentRepository = attachmentRepository;
        this.attachmentService = attachmentService;
    }

    public MaintenanceSetting get() {
        return maintenanceSettingRepository.findById(Boolean.TRUE).orElseThrow();
    }

    // Called on (almost) every request by MaintenanceModeFilter — kept as a
    // cheap, direct read rather than adding a cache, matching this app's
    // small-scale/avoid-overengineering stance elsewhere. Revisit if this
    // ever shows up as real latency at a much larger request volume.
    public boolean isEnabled() {
        return get().isEnabled();
    }

    @Transactional
    public MaintenanceSetting update(UpdateMaintenanceRequest request) {
        MaintenanceSetting setting = get();
        if (setting.getVersion() != request.version()) {
            throw new StaleVersionException(MaintenanceDto.from(setting));
        }

        UUID previousImageId = setting.getImageAttachment() == null ? null : setting.getImageAttachment().getId();
        setting.setEnabled(request.enabled());
        setting.setMessageAr(request.messageAr());
        setting.setMessageEn(request.messageEn());
        setting.setMessageHi(request.messageHi());
        setting.setImageAttachment(resolveAttachment(request.imageAttachmentId()));
        setting.setReopenAt(request.reopenAt());
        MaintenanceSetting saved = maintenanceSettingRepository.save(setting);

        if (previousImageId != null && !previousImageId.equals(request.imageAttachmentId())) {
            attachmentService.delete(previousImageId);
        }
        return saved;
    }

    private Attachment resolveAttachment(UUID attachmentId) {
        if (attachmentId == null) return null;
        return attachmentRepository.findById(attachmentId).orElseThrow(() -> ApiException.validation(
                "Image attachment not found", Map.of("imageAttachmentId", "does not exist")));
    }
}
