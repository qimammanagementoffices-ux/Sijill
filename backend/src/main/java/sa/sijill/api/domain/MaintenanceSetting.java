package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Single-row settings table — id is always TRUE, enforced by the migration's
// check constraint, same pattern as BrandingSetting. reopen_at is shown as a
// countdown on the maintenance page but does NOT auto-disable maintenance —
// an admin always toggles `enabled` off explicitly (decision-record.md D6).
@Entity
@Table(name = "maintenance_setting")
@Getter
@Setter
@NoArgsConstructor
public class MaintenanceSetting {

    @Id
    private Boolean id = Boolean.TRUE;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "message_ar")
    private String messageAr;

    @Column(name = "message_en")
    private String messageEn;

    @Column(name = "message_hi")
    private String messageHi;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "image_attachment_id")
    private Attachment imageAttachment;

    @Column(name = "reopen_at")
    private Instant reopenAt;

    @Version
    private Integer version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PreUpdate
    @PrePersist
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
