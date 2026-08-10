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

    @OneToMany(mappedBy = "needRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<NeedRequestLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "needRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
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
