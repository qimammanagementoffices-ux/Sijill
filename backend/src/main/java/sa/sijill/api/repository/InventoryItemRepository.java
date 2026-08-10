package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.InventoryItem;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {

    boolean existsByDomainAndCode(Domain domain, String code);

    @Query("""
            select i from InventoryItem i
            where i.domain = :domain
              and (:q is null or :q = ''
                or lower(i.nameAr) like lower(concat('%', :q, '%'))
                or lower(i.nameEn) like lower(concat('%', :q, '%'))
                or lower(i.code) like lower(concat('%', :q, '%')))
              and (:lowStockOnly = false or i.quantity <= i.minQuantity)
            """)
    Page<InventoryItem> search(
            @Param("domain") Domain domain,
            @Param("q") String q,
            @Param("lowStockOnly") boolean lowStockOnly,
            Pageable pageable);

    long countByDomain(Domain domain);

    @Query("select coalesce(sum(i.quantity), 0) from InventoryItem i where i.domain = :domain")
    long sumQuantityByDomain(@Param("domain") Domain domain);

    @Query("select count(i) from InventoryItem i where i.domain = :domain and i.quantity <= i.minQuantity")
    long countLowStockByDomain(@Param("domain") Domain domain);

    // One sequence per domain so warehouse and maintenance codes number
    // independently -- the unique constraint is (domain, code), so WH-0001
    // and MN-0001 coexist. See V63__code_sequences.sql.
    @Query(value = "select nextval('warehouse_item_code_seq')", nativeQuery = true)
    long nextWarehouseCodeSequence();

    @Query(value = "select nextval('maintenance_item_code_seq')", nativeQuery = true)
    long nextMaintenanceCodeSequence();
}
