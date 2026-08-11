package sa.sijill.api.repository;

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
            where (:status is null or r.status = :status)
              and (:requesterId is null or r.requester.id = :requesterId)
              and (:q is null or :q = ''
                or lower(r.requester.name) like lower(concat('%', :q, '%'))
                or lower(r.asset.assetNumber) like lower(concat('%', :q, '%'))
                or lower(r.asset.nameAr) like lower(concat('%', :q, '%'))
                or lower(r.asset.nameEn) like lower(concat('%', :q, '%')))
            order by r.createdAt desc
            """)
    Page<AssetRequest> search(
            @Param("status") AssetRequestStatus status,
            @Param("requesterId") UUID requesterId,
            @Param("q") String q,
            Pageable pageable);

    long countByStatus(AssetRequestStatus status);
}
