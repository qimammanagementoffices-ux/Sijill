package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.MaintenancePriority;
import sa.sijill.api.domain.MaintenanceRequest;
import sa.sijill.api.domain.MaintenanceRequestStatus;

public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, UUID> {

    @Query("""
            select r from MaintenanceRequest r
            where (:status is null or r.status = :status)
              and (:requesterId is null or r.requester.id = :requesterId)
            order by r.createdAt desc
            """)
    Page<MaintenanceRequest> search(
            @Param("status") MaintenanceRequestStatus status,
            @Param("requesterId") UUID requesterId,
            Pageable pageable);

    long countByStatus(MaintenanceRequestStatus status);

    long countByPriorityAndStatusNot(MaintenancePriority priority, MaintenanceRequestStatus status);
}
