package sa.sijill.api.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.OfficialHoliday;

public interface OfficialHolidayRepository extends JpaRepository<OfficialHoliday, LocalDate> {
    List<OfficialHoliday> findAllByOrderByDateAsc();
}
