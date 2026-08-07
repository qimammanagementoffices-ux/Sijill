package sa.sijill.api.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.AttachmentRepository;

// Master spec §8: "upload size/type limits, safe filenames." Type
// allowlist and size cap enforced here, before anything touches storage;
// StorageService separately guards the storage key against the client's
// filename.
@Service
public class AttachmentService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp", "application/pdf");
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024; // 10 MB

    private final AttachmentRepository attachmentRepository;
    private final StorageService storageService;

    public AttachmentService(AttachmentRepository attachmentRepository, StorageService storageService) {
        this.attachmentRepository = attachmentRepository;
        this.storageService = storageService;
    }

    public List<Attachment> list(AttachmentOwnerType ownerType, UUID ownerId) {
        return attachmentRepository.findByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(ownerType, ownerId);
    }

    @Transactional
    public Attachment upload(AttachmentOwnerType ownerType, UUID ownerId, MultipartFile file, Employee actor) {
        if (file == null || file.isEmpty()) {
            throw ApiException.validation("File is required", Map.of("file", "must not be empty"));
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw ApiException.validation(
                    "Unsupported file type", Map.of("file", "must be JPEG, PNG, WEBP, or PDF"));
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw ApiException.validation("File too large", Map.of("file", "must be 10MB or smaller"));
        }

        StorageService.UploadResult uploaded = storageService.upload(file, ownerType.name().toLowerCase());

        Attachment attachment = new Attachment();
        attachment.setOwnerType(ownerType);
        attachment.setOwnerId(ownerId);
        attachment.setStorageKey(uploaded.storageKey());
        attachment.setUrl(uploaded.url());
        attachment.setFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        attachment.setContentType(file.getContentType());
        attachment.setSizeBytes(file.getSize());
        attachment.setUploadedBy(actor);
        return attachmentRepository.save(attachment);
    }

    @Transactional
    public void delete(UUID id) {
        Attachment attachment =
                attachmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Attachment not found"));
        storageService.delete(attachment.getStorageKey());
        attachmentRepository.delete(attachment);
    }
}
