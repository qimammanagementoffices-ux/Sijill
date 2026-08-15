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

    // Written when an official trims or drops a line. LAZY: nothing reads the
    // line through this association.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_request_line_id")
    private NeedRequestLine line;

    // The DTO needs the line's id after the transaction closes, and the id is
    // this row's own foreign key. Reading it through the association instead
    // meant loading the whole line -- and its inventory item -- once per edit,
    // per action, per request on every list page. Mapped read-only; `line`
    // above stays the writable side.
    @Column(name = "need_request_line_id", insertable = false, updatable = false)
    private UUID lineId;

    /**
     * Sets both sides. The read-only mirror is only populated by the database
     * on load, so a decision's own response would carry a null line id if the
     * association were set on its own.
     */
    public void assignLine(NeedRequestLine line) {
        this.line = line;
        this.lineId = line == null ? null : line.getId();
    }

    @Column(name = "quantity_before", nullable = false)
    private int quantityBefore;

    // Null when the line was dropped rather than re-quantified.
    @Column(name = "quantity_after")
    private Integer quantityAfter;

    @Column(name = "removed", nullable = false)
    private boolean removed;
}
