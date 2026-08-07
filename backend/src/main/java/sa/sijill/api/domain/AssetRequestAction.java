package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "asset_request_action")
@Getter
@Setter
@NoArgsConstructor
public class AssetRequestAction {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_request_id")
    private AssetRequest assetRequest;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "actor_employee_id")
    private Employee actor;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "reason")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
