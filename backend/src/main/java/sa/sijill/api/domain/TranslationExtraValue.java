package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// One row per (translation key, admin-added language) pair — see
// decision-record.md D7. Not linked via @ManyToOne to Translation/Language
// entities; translationKey/languageCode are plain columns (the FK
// constraints live at the DB level in V24) since nothing here needs to
// navigate to the parent entities, only filter/join by their identifiers.
@Entity
@Table(name = "translation_extra_value")
@Getter
@Setter
@NoArgsConstructor
public class TranslationExtraValue {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "translation_key", nullable = false)
    private String translationKey;

    @Column(name = "language_code", nullable = false)
    private String languageCode;

    @Column(name = "value", nullable = false)
    private String value;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = Instant.now();
    }
}
