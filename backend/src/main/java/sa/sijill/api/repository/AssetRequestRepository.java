package sa.sijill.api.repository;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.AssetRequest;
import sa.sijill.api.domain.AssetRequestStatus;

public interface AssetRequestRepository extends JpaRepository<AssetRequest, UUID> {

    @Query("""
            select r from AssetRequest r
            left join r.asset legacyAsset
            where (:archived = true and r.archivedAt is not null
                or :archived = false and r.archivedAt is null)
              and (:status is null
                or r.status = :status
                or (:status = sa.sijill.api.domain.AssetRequestStatus.PENDING
                    and r.status = sa.sijill.api.domain.AssetRequestStatus.POSTPONED
                    and r.postponedUntil is not null and r.postponedUntil <= :today))
              and (:requesterId is null or r.requester.id = :requesterId)
              and (:q is null or :q = ''
                or lower(r.requester.name) like lower(concat('%', :q, '%'))
                or lower(legacyAsset.assetNumber) like lower(concat('%', :q, '%'))
                or lower(legacyAsset.nameAr) like lower(concat('%', :q, '%'))
                or lower(legacyAsset.nameEn) like lower(concat('%', :q, '%'))
                or exists (
                    select line.id from AssetRequestLine line
                    left join line.asset asset
                    left join line.category category
                    where line.assetRequest = r
                      and (lower(asset.assetNumber) like lower(concat('%', :q, '%'))
                        or lower(asset.nameAr) like lower(concat('%', :q, '%'))
                        or lower(asset.nameEn) like lower(concat('%', :q, '%'))
                        or lower(category.nameAr) like lower(concat('%', :q, '%'))
                        or lower(category.nameEn) like lower(concat('%', :q, '%')))))
            order by r.createdAt desc
            """)
    Page<AssetRequest> search(
            @Param("status") AssetRequestStatus status,
            @Param("requesterId") UUID requesterId,
            @Param("q") String q,
            @Param("archived") boolean archived,
            @Param("today") LocalDate today,
            Pageable pageable);

    @Query("""
            select count(r) from AssetRequest r
            where r.archivedAt is null
              and (r.status = :status
                or (:status = sa.sijill.api.domain.AssetRequestStatus.PENDING
                    and r.status = sa.sijill.api.domain.AssetRequestStatus.POSTPONED
                    and r.postponedUntil is not null and r.postponedUntil <= :today))
            """)
    long countByStatus(@Param("status") AssetRequestStatus status, @Param("today") LocalDate today);
}
