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
            order by r.createdAt desc
            """)
    Page<AssetRequest> search(
            @Param("status") AssetRequestStatus status,
            @Param("requesterId") UUID requesterId,
            Pageable pageable);

    long countByStatus(AssetRequestStatus status);
}
