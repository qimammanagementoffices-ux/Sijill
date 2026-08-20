package sa.sijill.api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {

    @Query("""
            select
                a.id as id,
                a.ownerType as ownerType,
                a.ownerId as ownerId,
                a.url as url,
                a.filename as filename,
                a.contentType as contentType,
                a.sizeBytes as sizeBytes,
                uploader.name as uploadedByName,
                a.createdAt as createdAt
            from Attachment a
            left join a.uploadedBy uploader
            where a.ownerType = :ownerType and a.ownerId = :ownerId
            order by a.createdAt asc
            """)
    List<AttachmentSummary> findSummariesByOwner(
            @Param("ownerType") AttachmentOwnerType ownerType, @Param("ownerId") UUID ownerId);

    @Query("""
            select
                a.id as id,
                a.ownerType as ownerType,
                a.ownerId as ownerId,
                a.url as url,
                a.filename as filename,
                a.contentType as contentType,
                a.sizeBytes as sizeBytes,
                uploader.name as uploadedByName,
                a.createdAt as createdAt
            from Attachment a
            left join a.uploadedBy uploader
            where a.ownerType = :ownerType and a.ownerId in :ownerIds
            order by a.createdAt asc
            """)
    List<AttachmentSummary> findSummariesByOwners(
            @Param("ownerType") AttachmentOwnerType ownerType,
            @Param("ownerIds") java.util.Collection<UUID> ownerIds);

    Optional<Attachment> findFirstByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(AttachmentOwnerType ownerType, UUID ownerId);

    List<Attachment> findByOwnerTypeAndOwnerIdIn(AttachmentOwnerType ownerType, java.util.Collection<UUID> ownerIds);
}
