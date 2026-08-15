package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Single-row settings table — id is always TRUE, enforced by the migration's
// check constraint, same pattern as MaintenanceSetting and BrandingSetting.
//
// Per system rather than one switch for the school: stock, maintenance and
// assets carry different weight and are staffed differently, so the school
// may reasonably want a counter-signature on one and not the others.
@Entity
@Table(name = "review_policy")
@Getter
@Setter
@NoArgsConstructor
public class ReviewPolicy {

    @Id
    private Boolean id = Boolean.TRUE;

    @Column(name = "warehouse_two_level", nullable = false)
    private boolean warehouseTwoLevel;

    @Column(name = "maintenance_two_level", nullable = false)
    private boolean maintenanceTwoLevel;

    @Column(name = "asset_two_level", nullable = false)
    private boolean assetTwoLevel;

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
