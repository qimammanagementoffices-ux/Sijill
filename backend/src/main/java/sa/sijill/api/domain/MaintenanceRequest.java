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
@Table(name = "maintenance_request")
@Getter
@Setter
@NoArgsConstructor
public class MaintenanceRequest {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "requester_employee_id")
    private Employee requester;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "fault_type_id")
    private FaultType faultType;

    @Column(name = "location")
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private MaintenancePriority priority;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MaintenanceRequestStatus status;

    @Column(name = "suggested_start_date")
    private LocalDate suggestedStartDate;

    // See NeedRequest for why these four exist: resurfacing is a query
    // condition, an overturn must not land back on the same official, and
    // archive is a flag so it cannot erase the status it hides.
    @Column(name = "postponed_until")
    private LocalDate postponedUntil;

    @Column(name = "returned_by_senior", nullable = false)
    private boolean returnedBySenior;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "archived_by_employee_id")
    private Employee archivedBy;

    // Without @OrderBy the timeline renders in whatever order Postgres returns.
    @OneToMany(mappedBy = "maintenanceRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("createdAt")
    private List<MaintenanceRequestAction> actions = new ArrayList<>();

    @OneToMany(mappedBy = "maintenanceRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<MaintenanceRequestPartUsed> partsUsed = new ArrayList<>();

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
