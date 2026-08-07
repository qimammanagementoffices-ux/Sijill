package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Single-row settings table — id is always TRUE, enforced by the migration's
// check constraint, so there's never more than one row to reconcile.
@Entity
@Table(name = "branding_setting")
@Getter
@Setter
@NoArgsConstructor
public class BrandingSetting {

    @Id
    private Boolean id = Boolean.TRUE;

    @Column(name = "preset", nullable = false)
    private String preset;

    @Column(name = "primary_color", nullable = false)
    private String primaryColor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "logo_attachment_id")
    private Attachment logoAttachment;

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
