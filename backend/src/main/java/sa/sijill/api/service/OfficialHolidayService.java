package sa.sijill.api.service;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.OfficialHoliday;
import sa.sijill.api.repository.OfficialHolidayRepository;

@Service
public class OfficialHolidayService {

    private final OfficialHolidayRepository repository;

    public OfficialHolidayService(OfficialHolidayRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<OfficialHoliday> list() {
        return repository.findAllByOrderByDateAsc();
    }

    @Transactional
    public OfficialHoliday save(LocalDate date, String name) {
        OfficialHoliday holiday = repository.findById(date)
            .orElseGet(() -> new OfficialHoliday(date, null));
        String trimmedName = name == null ? null : name.trim();
        holiday.setName(trimmedName == null || trimmedName.isEmpty() ? null : trimmedName);
        return repository.save(holiday);
    }

    @Transactional
    public void delete(LocalDate date) {
        repository.deleteById(date);
    }
}
