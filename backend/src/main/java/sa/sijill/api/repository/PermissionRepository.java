package sa.sijill.api.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import sa.sijill.api.domain.Permission;

public interface PermissionRepository extends JpaRepository<Permission, String> {

    // Left-joins from permission so every key appears even with zero holders;
    // the active-employee filter lives in the join condition (not a WHERE
    // clause) so it doesn't turn the outer join back into an inner one.
    @Query(
            value =
                    "select p.key as key, count(e.id) as employeeCount "
                            + "from permission p "
                            + "left join employee_permission ep on ep.permission_key = p.key "
                            + "left join employee e on e.id = ep.employee_id and e.active = true "
                            + "group by p.key",
            nativeQuery = true)
    List<PermissionEmployeeCount> countActiveEmployeesByPermission();
}
