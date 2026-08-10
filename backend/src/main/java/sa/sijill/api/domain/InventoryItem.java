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
@Table(name = "inventory_item")
@Getter
@Setter
@NoArgsConstructor
public class InventoryItem {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "domain", nullable = false)
    private Domain domain;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "name_ar", nullable = false)
    private String nameAr;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "name_hi")
    private String nameHi;

    // EAGER: see Employee.jobTitle for why (DTO mapping happens after the
    // transaction that loaded this entity has already closed).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "unit")
    private String unit;

    @Column(name = "weight")
    private BigDecimal weight;

    @Column(name = "date_added", nullable = false)
    private LocalDate dateAdded;

    @Column(name = "min_quantity", nullable = false)
    private int minQuantity;

    @Column(name = "last_purchase_price")
    private BigDecimal lastPurchasePrice;

    @Column(name = "tax_rate")
    private BigDecimal taxRate;

    @Column(name = "tax_inclusive_price")
    private BigDecimal taxInclusivePrice;

    @Column(name = "active", nullable = false)
    private boolean active = true;

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

    public boolean isLowStock() {
        return quantity <= minQuantity;
    }
}
