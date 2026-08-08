package sa.sijill.api.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.BackupSnapshot;

public interface BackupSnapshotRepository extends JpaRepository<BackupSnapshot, UUID> {

    List<BackupSnapshot> findAllByOrderByCreatedAtDesc();

    List<BackupSnapshot> findByCreatedAtBefore(Instant cutoff);
}
