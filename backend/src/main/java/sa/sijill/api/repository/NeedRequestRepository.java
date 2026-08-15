package sa.sijill.api.repository;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestStatus;

public interface NeedRequestRepository extends JpaRepository<NeedRequest, UUID> {

    /**
     * Asking for PENDING also returns postponed requests whose date has
     * arrived — resurfacing is a query condition, not a scheduled job, so the
     * queue and its badge count cannot drift apart. {@code underReview}
     * overrides {@code status} and returns both under-review states.
     */
    @Query("""
            select r from NeedRequest r
            where (:archived = true and r.archivedAt is not null
                or :archived = false and r.archivedAt is null)
              and (:underReview = false or r.status in (
                    sa.sijill.api.domain.NeedRequestStatus.APPROVED_UNDER_REVIEW,
                    sa.sijill.api.domain.NeedRequestStatus.REJECTED_UNDER_REVIEW))
              and (:underReview = true or :status is null
                or r.status = :status
                or (:status = sa.sijill.api.domain.NeedRequestStatus.PENDING
                    and r.status = sa.sijill.api.domain.NeedRequestStatus.POSTPONED
                    and r.postponedUntil is not null and r.postponedUntil <= :today))
              and (:requesterId is null or r.requester.id = :requesterId)
              -- Department scope. :unscoped short-circuits it for anyone who
              -- covers the whole school. Own requests are always visible:
              -- being outside an official's branch must not hide a request
              -- from the person who raised it.
              and (:unscoped = true
                or r.department.id in :departmentIds
                or r.requester.id = :actorId)
              and (:q is null or :q = ''
                or lower(r.requester.name) like lower(concat('%', :q, '%'))
                or lower(coalesce(r.notes, '')) like lower(concat('%', :q, '%')))
            order by r.createdAt desc
            """)
    Page<NeedRequest> search(
            @Param("status") NeedRequestStatus status,
            @Param("requesterId") UUID requesterId,
            @Param("q") String q,
            @Param("archived") boolean archived,
            // The counter-signer's queue is both review states at once, which a
            // single status parameter cannot express.
            @Param("underReview") boolean underReview,
            @Param("today") LocalDate today,
            // Never empty: pass a throwaway id when the scope is empty, since
            // "in ()" is not valid SQL.
            @Param("departmentIds") java.util.Collection<UUID> departmentIds,
            @Param("unscoped") boolean unscoped,
            @Param("actorId") UUID actorId,
            Pageable pageable);

    @Query("""
            select count(r) from NeedRequest r
            where r.archivedAt is null
              and (r.status = :status
                or (:status = sa.sijill.api.domain.NeedRequestStatus.PENDING
                    and r.status = sa.sijill.api.domain.NeedRequestStatus.POSTPONED
                    and r.postponedUntil is not null and r.postponedUntil <= :today))
            """)
    long countByStatus(@Param("status") NeedRequestStatus status, @Param("today") LocalDate today);
}
