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

    // Set only at finish — null until then. Per decision-record.md D1,
    // may be less than quantityRequested (partial fulfillment).
    @Column(name = "quantity_issued")
    private Integer quantityIssued;
}
