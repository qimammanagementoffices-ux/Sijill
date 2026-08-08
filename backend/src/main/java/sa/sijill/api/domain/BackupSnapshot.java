package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "backup_snapshot")
@Getter
@Setter
@NoArgsConstructor
public class BackupSnapshot {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "filename", nullable = false)
    private String filename;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "triggered_by", nullable = false)
    private BackupTrigger triggeredBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
