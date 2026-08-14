package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import sa.sijill.api.repository.OfficialHolidayRepository;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SuggestedStartDateCalculatorTest {

    private final OfficialHolidayRepository holidays = mock(OfficialHolidayRepository.class);
    private final SuggestedStartDateCalculator calculator = new SuggestedStartDateCalculator(holidays);

    @Test
    void normalDayJustAddsOne() {
        // 2024-01-01 was a Monday.
        LocalDate monday = LocalDate.of(2024, 1, 1);
        assertThat(calculator.from(monday)).isEqualTo(LocalDate.of(2024, 1, 2));
    }

    @Test
    void rollsFridayToSaturday() {
        // 2024-01-04 was a Thursday; the day after is Friday, the Saudi weekend start.
        LocalDate thursday = LocalDate.of(2024, 1, 4);
        assertThat(calculator.from(thursday)).isEqualTo(LocalDate.of(2024, 1, 6));
    }

    @Test
    void fridayReferenceGivesSaturdayDirectly() {
        LocalDate friday = LocalDate.of(2024, 1, 5);
        assertThat(calculator.from(friday)).isEqualTo(LocalDate.of(2024, 1, 6));
    }

    @Test
    void skipsConfiguredHolidaysAndFridayUntilAWorkingDay() {
        LocalDate thursday = LocalDate.of(2024, 4, 4);
        LocalDate saturday = LocalDate.of(2024, 4, 6);
        LocalDate sunday = LocalDate.of(2024, 4, 7);
        when(holidays.existsById(saturday)).thenReturn(true);
        when(holidays.existsById(sunday)).thenReturn(true);

        assertThat(calculator.from(thursday)).isEqualTo(LocalDate.of(2024, 4, 8));
    }
}
