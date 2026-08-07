package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.PurchaseInvoice;

public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, UUID> {

    boolean existsByDomainAndInvoiceNumber(Domain domain, String invoiceNumber);

    Page<PurchaseInvoice> findByDomain(Domain domain, Pageable pageable);
}
