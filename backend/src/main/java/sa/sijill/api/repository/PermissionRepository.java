package sa.sijill.api.repository;

import sa.sijill.api.domain.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, String> {}
