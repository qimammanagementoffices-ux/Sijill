package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DB-backed UI string, replacing the static ar.json/en.json dictionaries.
 * Key is dot-namespaced to mirror the frontend's nested Dictionary shape
 * (frontend/src/i18n/getDictionary.ts) — e.g. "employees.searchPlaceholder".
 * Keys are seeded by migration only; the admin API edits values, not keys.
 */
@Entity
@Table(name = "translation")
@Getter
@Setter
@NoArgsConstructor
public class Translation {

    @Id
    @Column(name = "key")
    private String key;

    @Column(name = "value_ar", nullable = false)
    private String valueAr;

    @Column(name = "value_en", nullable = false)
    private String valueEn;

    @Column(name = "value_hi")
    private String valueHi;

    @Version
    private Integer version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = Instant.now();
    }
}
