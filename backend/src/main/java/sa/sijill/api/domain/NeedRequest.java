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
@Table(name = "need_request")
@Getter
@Setter
@NoArgsConstructor
public class NeedRequest {

    @Id
    @GeneratedValue
    private UUID id;

    // EAGER on all three: see Employee.jobTitle for why (DTO mapping for
    // list/detail happens in the controller after the transaction closes).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "requester_employee_id")
    private Employee requester;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    // Optional: which room the items are needed in. EAGER for the same
    // reason as the three above.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "notes")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private NeedRequestStatus status;

    @Column(name = "suggested_start_date")
    private LocalDate suggestedStartDate;

    // The date a postponed request returns to the pending queue. Resurfacing
    // is a query condition (status = POSTPONED and postponedUntil <= today),
    // not a scheduled job — no night to miss, no state to repair.
    @Column(name = "postponed_until")
    private LocalDate postponedUntil;

    // Set when the senior approver overturns a first-level decision and sends
    // the request back. Blocks the same official from simply repeating the
    // decision that was just overturned.
    @Column(name = "returned_by_senior", nullable = false)
    private boolean returnedBySenior;

    // Archive is a flag, not a status: a status would erase whether the
    // request was rejected or closed, and make "restore" ambiguous.
    @Column(name = "archived_at")
    private Instant archivedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "archived_by_employee_id")
    private Employee archivedBy;

    @OneToMany(mappedBy = "needRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<NeedRequestLine> lines = new ArrayList<>();

    // Without @OrderBy the timeline renders in whatever order Postgres returns.
    @OneToMany(mappedBy = "needRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("createdAt")
    private List<NeedRequestAction> actions = new ArrayList<>();

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
