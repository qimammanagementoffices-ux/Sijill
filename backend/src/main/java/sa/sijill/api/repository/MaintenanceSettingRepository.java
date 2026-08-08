package sa.sijill.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.MaintenanceSetting;

public interface MaintenanceSettingRepository extends JpaRepository<MaintenanceSetting, Boolean> {}
