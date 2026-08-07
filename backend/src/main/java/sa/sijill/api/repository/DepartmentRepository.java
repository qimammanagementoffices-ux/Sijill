package sa.sijill.api.repository;

import java.util.UUID;
import sa.sijill.api.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {}
