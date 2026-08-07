package sa.sijill.api.repository;

import java.util.Optional;
import java.util.UUID;
import sa.sijill.api.domain.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    Optional<Employee> findByPhone(String phone);

    boolean existsByPhone(String phone);

    @Query(value = "select nextval('employee_number_seq')", nativeQuery = true)
    long nextEmployeeNumberSequence();
}
