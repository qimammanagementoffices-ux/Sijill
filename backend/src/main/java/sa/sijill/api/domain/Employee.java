package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "employee")
@Getter
@Setter
@NoArgsConstructor
public class Employee {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "employee_number", nullable = false, unique = true)
    private String employeeNumber;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "phone", nullable = false, unique = true)
    private String phone;

    @Column(name = "pin_hash", nullable = false)
    private String pinHash;

    @Column(name = "email")
    private String email;

    @Column(name = "national_id")
    private String nationalId;

    @Column(name = "joined_date", nullable = false)
    private LocalDate joinedDate;

    @Column(name = "photo_key")
    private String photoKey;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    // EAGER: EmployeeListItem/EmployeeDetail always render this, and the
    // DTO mapping happens in the controller after the request's
    // transaction closes — LAZY here throws LazyInitializationException
    // (open-in-view is off; see docs/api-conventions.md).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "job_title_id")
    private JobTitle jobTitle;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "employee_department",
            joinColumns = @JoinColumn(name = "employee_id"),
            inverseJoinColumns = @JoinColumn(name = "department_id"))
    private Set<Department> departments = new HashSet<>();

    // Loaded eagerly: every authenticated request needs the current permission
    // set to build Spring Security authorities (see JwtAuthenticationFilter) —
    // permissions are never trusted from the JWT itself.
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "employee_permission",
            joinColumns = @JoinColumn(name = "employee_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_key"))
    private Set<Permission> permissions = new HashSet<>();

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
