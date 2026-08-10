package sa.sijill.api.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.PurchaseInvoiceLine;

// Backs the item card's two history sections. Lines are queried directly
// rather than through their invoice/request aggregates: the card wants
// "every purchase of this one item", not whole invoices.
public interface ItemHistoryRepository extends JpaRepository<PurchaseInvoiceLine, UUID> {

    @Query("""
            select l from PurchaseInvoiceLine l
            join fetch l.invoice i
            where l.inventoryItem.id = :itemId
            order by i.invoiceDate desc
            """)
    List<PurchaseInvoiceLine> findPurchasesByItem(@Param("itemId") UUID itemId);

    @Query("""
            select l from NeedRequestLine l
            join fetch l.needRequest r
            where l.inventoryItem.id = :itemId
            order by r.createdAt desc
            """)
    List<sa.sijill.api.domain.NeedRequestLine> findRequestsByItem(@Param("itemId") UUID itemId);
}
