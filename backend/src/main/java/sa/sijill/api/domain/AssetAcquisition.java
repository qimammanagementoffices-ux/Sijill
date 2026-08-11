package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "asset_acquisition")
@Getter @Setter @NoArgsConstructor
public class AssetAcquisition {
    @Id @GeneratedValue private UUID id;
    @Column(name = "document_number", nullable = false, unique = true) private String documentNumber;
    @Column(name = "document_date", nullable = false) private LocalDate documentDate;
    private String vendor;
    @Column(nullable = false) private BigDecimal amount = BigDecimal.ZERO;
    private String notes;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "asset_acquisition_asset", joinColumns = @JoinColumn(name = "acquisition_id"), inverseJoinColumns = @JoinColumn(name = "asset_id"))
    private Set<Asset> assets = new LinkedHashSet<>();
    @Version private Integer version;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @PrePersist void create() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void update() { updatedAt = Instant.now(); }
}
