package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.PurchaseInvoice;

public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, UUID> {

    boolean existsByDomainAndInvoiceNumber(Domain domain, String invoiceNumber);

    Page<PurchaseInvoice> findByDomain(Domain domain, Pageable pageable);

    // Null bound = open-ended, so an unset filter behaves like findByDomain.
    @Query("""
            select i from PurchaseInvoice i
            where i.domain = :domain
              and i.invoiceDate >= coalesce(:dateFrom, i.invoiceDate)
              and i.invoiceDate <= coalesce(:dateTo, i.invoiceDate)
            """)
    Page<PurchaseInvoice> search(
            @Param("domain") Domain domain,
            @Param("dateFrom") java.time.LocalDate dateFrom,
            @Param("dateTo") java.time.LocalDate dateTo,
            Pageable pageable);
}
