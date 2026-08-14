package sa.sijill.api.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import org.springframework.stereotype.Component;
import sa.sijill.api.repository.OfficialHolidayRepository;

// Start on the first working day after submission. Friday is always a weekly
// day off; administrators can add any further official holidays.
@Component
public class SuggestedStartDateCalculator {

    private final OfficialHolidayRepository officialHolidayRepository;

    public SuggestedStartDateCalculator(OfficialHolidayRepository officialHolidayRepository) {
        this.officialHolidayRepository = officialHolidayRepository;
    }

    public LocalDate from(LocalDate reference) {
        LocalDate candidate = reference.plusDays(1);
        while (candidate.getDayOfWeek() == DayOfWeek.FRIDAY
            || officialHolidayRepository.existsById(candidate)) {
            candidate = candidate.plusDays(1);
        }
        return candidate;
    }
}
