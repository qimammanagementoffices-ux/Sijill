package sa.sijill.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Fixed catalogue seeded by V2__employee_structure.sql — never created or
 * deleted through the API. See docs/decision-record.md D4.
 */
@Entity
@Table(name = "permission")
@Getter
@Setter
@NoArgsConstructor
public class Permission {

    @Id
    @Column(name = "key")
    private String key;

    @Column(name = "description", nullable = false)
    private String description;
}
