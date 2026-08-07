package sa.sijill.api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {

    List<Attachment> findByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(AttachmentOwnerType ownerType, UUID ownerId);

    Optional<Attachment> findFirstByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(AttachmentOwnerType ownerType, UUID ownerId);
}
