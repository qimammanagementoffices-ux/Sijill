package sa.sijill.api.repository;

import java.time.Instant;
import java.util.UUID;
import sa.sijill.api.domain.AttachmentOwnerType;

/**
 * Bounded attachment read model. In particular, uploadedByName is selected as
 * a scalar so listing attachments never materializes the uploader's employee
 * graph (photo, departments, permissions, and job title).
 */
public interface AttachmentSummary {

    UUID getId();

    AttachmentOwnerType getOwnerType();

    UUID getOwnerId();

    String getUrl();

    String getFilename();

    String getContentType();

    long getSizeBytes();

    String getUploadedByName();

    Instant getCreatedAt();
}
