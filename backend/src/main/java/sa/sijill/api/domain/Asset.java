package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "asset")
@Getter
@Setter
@NoArgsConstructor
public class Asset {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "asset_number", nullable = false, unique = true)
    private String assetNumber;

    @Column(name = "name_ar", nullable = false)
    private String nameAr;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "name_ur")
    private String nameUr;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "custodian_employee_id")
    private Employee custodian;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssetStatus status;

    @Column(name = "acquisition_date")
    private LocalDate acquisitionDate;

    @Column(name = "acquisition_cost")
    private BigDecimal acquisitionCost;

    @Column(name = "vendor")
    private String vendor;

    @Column(name = "notes")
    private String notes;

    // Public QR addressing token — never the primary key or asset number,
    // per docs/decision-record.md D2 (avoids exposing sequential/guessable
    // identifiers, allows rotation without changing asset identity).
    @Column(name = "public_token", nullable = false, unique = true)
    private UUID publicToken;

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
        if (publicToken == null) {
            publicToken = UUID.randomUUID();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
