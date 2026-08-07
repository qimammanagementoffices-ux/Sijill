package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "asset_request")
@Getter
@Setter
@NoArgsConstructor
public class AssetRequest {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "requester_employee_id")
    private Employee requester;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssetRequestStatus status;

    @Column(name = "suggested_start_date")
    private LocalDate suggestedStartDate;

    @OneToMany(mappedBy = "assetRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<AssetRequestAction> actions = new ArrayList<>();

    @Version
    private Integer version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
