package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// The request's own action history — distinct from the global audit_log,
// which also gets an entry per action for the cross-entity trail. Master
// spec §5: "Use request action history rather than only approvedByEmployeeId."
@Entity
@Table(name = "need_request_action")
@Getter
@Setter
@NoArgsConstructor
public class NeedRequestAction {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_request_id")
    private NeedRequest needRequest;

    // EAGER: see Employee.jobTitle for why.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "actor_employee_id")
    private Employee actor;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "reason")
    private String reason;

    // Line trims and drops made as part of this decision. Empty for actions
    // that only changed status.
    @OneToMany(mappedBy = "action", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<NeedRequestActionLine> lineEdits = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
