package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.Room;

public interface RoomRepository extends JpaRepository<Room, UUID> {}
