package sa.sijill.api.repository;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.AssetAcquisition;

public interface AssetAcquisitionRepository extends JpaRepository<AssetAcquisition, UUID> {
    boolean existsByDocumentNumber(String documentNumber);

    @Query("""
            select distinct a from AssetAcquisition a left join a.assets asset
            where (:q is null or :q = '' or lower(a.documentNumber) like lower(concat('%', :q, '%'))
              or lower(coalesce(a.vendor, '')) like lower(concat('%', :q, '%'))
              or lower(asset.assetNumber) like lower(concat('%', :q, '%'))
              or lower(asset.nameAr) like lower(concat('%', :q, '%'))
              or lower(asset.nameEn) like lower(concat('%', :q, '%')))
              and (:assetId is null or asset.id = :assetId)
              and a.documentDate >= coalesce(:dateFrom, a.documentDate)
              and a.documentDate <= coalesce(:dateTo, a.documentDate)
            """)
    Page<AssetAcquisition> search(@Param("q") String q, @Param("assetId") UUID assetId,
            @Param("dateFrom") LocalDate dateFrom, @Param("dateTo") LocalDate dateTo, Pageable pageable);
}
