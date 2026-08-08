package sa.sijill.api.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    Optional<Employee> findByPhone(String phone);

    boolean existsByPhone(String phone);

    @Query(value = "select nextval('employee_number_seq')", nativeQuery = true)
    long nextEmployeeNumberSequence();

    @Query("""
            select e from Employee e
            where (:q is null or :q = ''
                or lower(e.name) like lower(concat('%', :q, '%'))
                or e.phone like concat('%', :q, '%')
                or lower(e.employeeNumber) like lower(concat('%', :q, '%')))
            """)
    Page<Employee> search(@Param("q") String q, Pageable pageable);

    long countByActiveTrue();
}
