package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "attachment")
@Getter
@Setter
@NoArgsConstructor
public class Attachment {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false)
    private AttachmentOwnerType ownerType;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "url", nullable = false)
    private String url;

    @Column(name = "filename", nullable = false)
    private String filename;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    // Keep the reverse edge lazy. Employee.photoAttachment is eager, so making
    // this eager as well creates Employee -> Attachment -> Employee cycles and
    // multiplies every employee's departments and permissions at each hop.
    // Attachment list responses obtain the uploader name through a bounded
    // scalar projection instead of traversing this association.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_employee_id")
    private Employee uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
