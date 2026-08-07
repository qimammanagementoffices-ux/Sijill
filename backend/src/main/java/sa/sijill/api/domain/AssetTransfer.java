package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "asset_transfer")
@Getter
@Setter
@NoArgsConstructor
public class AssetTransfer {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_room_id")
    private Room fromRoom;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_room_id")
    private Room toRoom;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_employee_id")
    private Employee fromEmployee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_employee_id")
    private Employee toEmployee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "actor_employee_id")
    private Employee actor;

    @Column(name = "reason")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
