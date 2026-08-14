package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// One line change carried by one decision. Kept per-action rather than as a
// single before/after pair on the line itself: the first-level approver and
// the counter-signing official can both trim the same line, and the card has
// to be able to say what each of them did.
@Entity
@Table(name = "need_request_action_line")
@Getter
@Setter
@NoArgsConstructor
public class NeedRequestActionLine {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_request_action_id")
    private NeedRequestAction action;

    // EAGER: the DTO reads the line id after the transaction closes.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "need_request_line_id")
    private NeedRequestLine line;

    @Column(name = "quantity_before", nullable = false)
    private int quantityBefore;

    // Null when the line was dropped rather than re-quantified.
    @Column(name = "quantity_after")
    private Integer quantityAfter;

    @Column(name = "removed", nullable = false)
    private boolean removed;
}
