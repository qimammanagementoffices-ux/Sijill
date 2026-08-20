package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.UUID;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.repository.AttachmentSummary;

public record AttachmentDto(
        UUID id,
        AttachmentOwnerType ownerType,
        UUID ownerId,
        String url,
        String filename,
        String contentType,
        long sizeBytes,
        String uploadedByName,
        Instant createdAt) {

    public static AttachmentDto fromUploaded(Attachment attachment, String uploadedByName) {
        return new AttachmentDto(
                attachment.getId(),
                attachment.getOwnerType(),
                attachment.getOwnerId(),
                attachment.getUrl(),
                attachment.getFilename(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                uploadedByName,
                attachment.getCreatedAt());
    }

    public static AttachmentDto from(AttachmentSummary attachment) {
        return new AttachmentDto(
                attachment.getId(),
                attachment.getOwnerType(),
                attachment.getOwnerId(),
                attachment.getUrl(),
                attachment.getFilename(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getUploadedByName(),
                attachment.getCreatedAt());
    }
}
