package sa.sijill.api.repository;

import java.util.UUID;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.Room;

public interface RoomRepository extends JpaRepository<Room, UUID> {

    List<Room> findByActiveTrueOrderByRoomNumberAsc();

    @Query("""
            select r from Room r
            left join r.department d
            left join r.custodian c
            where r.active = true
              and (:q is null or :q = ''
              or lower(r.roomNumber) like lower(concat('%', :q, '%'))
              or lower(r.nameAr) like lower(concat('%', :q, '%'))
              or lower(r.nameEn) like lower(concat('%', :q, '%'))
              or lower(coalesce(r.nameHi, '')) like lower(concat('%', :q, '%'))
              or lower(coalesce(d.nameAr, '')) like lower(concat('%', :q, '%'))
              or lower(coalesce(c.name, '')) like lower(concat('%', :q, '%')))
              and (:departmentId is null or d.id = :departmentId)
            """)
    Page<Room> search(
            @Param("q") String q,
            @Param("departmentId") UUID departmentId,
            Pageable pageable);
}
