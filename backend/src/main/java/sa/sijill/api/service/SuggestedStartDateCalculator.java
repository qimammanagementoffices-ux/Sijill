package sa.sijill.api.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

// Day after submission/approval; if that lands on Friday (Saudi weekend),
// roll to Saturday. Master spec §6.
@Component
public class SuggestedStartDateCalculator {

    public LocalDate from(LocalDate reference) {
        LocalDate nextDay = reference.plusDays(1);
        return nextDay.getDayOfWeek() == DayOfWeek.FRIDAY ? nextDay.plusDays(1) : nextDay;
    }
}
