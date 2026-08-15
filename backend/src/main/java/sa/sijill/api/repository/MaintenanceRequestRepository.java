package sa.sijill.api.repository;

import java.time.LocalDate;
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

    @Query(value = "select nextval('maintenance_request_number_seq')", nativeQuery = true)
    long nextRequestNumber();

    /** Asking for PENDING also returns postponed requests whose date has arrived. */
    @Query("""
            select r from MaintenanceRequest r
            left join r.faultType ft
            where (:archived = true and r.archivedAt is not null
                or :archived = false and r.archivedAt is null)
              and (:underReview = false or r.status in (
                    sa.sijill.api.domain.MaintenanceRequestStatus.APPROVED_UNDER_REVIEW,
                    sa.sijill.api.domain.MaintenanceRequestStatus.REJECTED_UNDER_REVIEW))
              and (:underReview = true or :status is null
                or r.status = :status
                or (:status = sa.sijill.api.domain.MaintenanceRequestStatus.PENDING
                    and r.status = sa.sijill.api.domain.MaintenanceRequestStatus.POSTPONED
                    and r.postponedUntil is not null and r.postponedUntil <= :today))
              and (:requesterId is null or r.requester.id = :requesterId)
              and (:unscoped = true
                or r.department.id in :departmentIds
                or r.requester.id = :actorId)
              and (:q is null or :q = ''
                or lower(r.requester.name) like lower(concat('%', :q, '%'))
                or lower(coalesce(r.location, '')) like lower(concat('%', :q, '%'))
                or lower(coalesce(r.description, '')) like lower(concat('%', :q, '%'))
                or lower(ft.nameAr) like lower(concat('%', :q, '%'))
                or lower(ft.nameEn) like lower(concat('%', :q, '%')))
            order by r.createdAt desc
            """)
    Page<MaintenanceRequest> search(
            @Param("status") MaintenanceRequestStatus status,
            @Param("requesterId") UUID requesterId,
            @Param("q") String q,
            @Param("archived") boolean archived,
            // The counter-signer's queue is both review states at once.
            @Param("underReview") boolean underReview,
            @Param("today") LocalDate today,
            @Param("departmentIds") java.util.Collection<UUID> departmentIds,
            @Param("unscoped") boolean unscoped,
            @Param("actorId") UUID actorId,
            Pageable pageable);

    @Query("""
            select count(r) from MaintenanceRequest r
            where r.archivedAt is null
              and (r.status = :status
                or (:status = sa.sijill.api.domain.MaintenanceRequestStatus.PENDING
                    and r.status = sa.sijill.api.domain.MaintenanceRequestStatus.POSTPONED
                    and r.postponedUntil is not null and r.postponedUntil <= :today))
            """)
    long countByStatus(@Param("status") MaintenanceRequestStatus status, @Param("today") LocalDate today);

    long countByPriorityAndStatusNot(MaintenancePriority priority, MaintenanceRequestStatus status);
}
