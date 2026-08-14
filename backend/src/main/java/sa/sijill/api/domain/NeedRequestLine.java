package sa.sijill.api.domain;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "need_request_line")
@Getter
@Setter
@NoArgsConstructor
public class NeedRequestLine {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_request_id")
    private NeedRequest needRequest;

    // EAGER: see Employee.jobTitle for why.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inventory_item_id")
    private InventoryItem inventoryItem;

    @Column(name = "quantity_requested", nullable = false)
    private int quantityRequested;

    // Set when an approver trims the line during a decision — null means
    // untouched. This, not quantityRequested, is what finish caps against;
    // otherwise a line approved down from 10 to 5 stays deliverable at 10.
    @Column(name = "quantity_approved")
    private Integer quantityApproved;

    // Approvers drop lines by marking them removed, never by deleting the
    // row: the card's "تم حذف الأصناف" notice has to outlive the decision
    // that produced it (workflow rule 4 applies inside the request too).
    @Column(name = "removed", nullable = false)
    private boolean removed;

    // Set only at finish — null until then. Per decision-record.md D1,
    // may be less than the approved quantity (partial fulfillment).
    @Column(name = "quantity_issued")
    private Integer quantityIssued;

    public int effectiveQuantity() {
        return quantityApproved != null ? quantityApproved : quantityRequested;
    }
}
