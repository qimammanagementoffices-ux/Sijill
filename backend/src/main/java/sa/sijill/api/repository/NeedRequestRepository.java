package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestStatus;

public interface NeedRequestRepository extends JpaRepository<NeedRequest, UUID> {

    @Query("""
            select r from NeedRequest r
            where (:status is null or r.status = :status)
              and (:requesterId is null or r.requester.id = :requesterId)
              and (:q is null or :q = ''
                or lower(r.requester.name) like lower(concat('%', :q, '%'))
                or lower(coalesce(r.notes, '')) like lower(concat('%', :q, '%')))
            order by r.createdAt desc
            """)
    Page<NeedRequest> search(
            @Param("status") NeedRequestStatus status,
            @Param("requesterId") UUID requesterId,
            @Param("q") String q,
            Pageable pageable);

    long countByStatus(NeedRequestStatus status);
}
