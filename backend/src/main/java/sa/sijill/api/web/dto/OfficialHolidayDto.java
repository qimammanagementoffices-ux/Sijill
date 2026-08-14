package sa.sijill.api.web.dto;

import java.time.LocalDate;
import sa.sijill.api.domain.OfficialHoliday;

public record OfficialHolidayDto(LocalDate date, String name) {
    public static OfficialHolidayDto from(OfficialHoliday holiday) {
        return new OfficialHolidayDto(holiday.getDate(), holiday.getName());
    }
}
