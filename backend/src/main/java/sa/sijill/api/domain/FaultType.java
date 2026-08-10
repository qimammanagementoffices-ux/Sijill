package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "fault_type")
@Getter
@Setter
@NoArgsConstructor
public class FaultType {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "name_ar", nullable = false)
    private String nameAr;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "name_ur")
    private String nameUr;

    // Hint for the finish-flow parts picker, not an enforced constraint —
    // master spec §7: "should suggest the matching parts category from
    // the fault type."
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "suggested_category_id")
    private Category suggestedCategory;

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
