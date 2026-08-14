package sa.sijill.api.web;

import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import sa.sijill.api.service.OfficialHolidayService;
import sa.sijill.api.web.dto.OfficialHolidayDto;
import sa.sijill.api.web.dto.SaveOfficialHolidayRequest;

@RestController
@RequestMapping("/api/v1/official-holidays")
@PreAuthorize("hasAuthority('sys.maintenance')")
public class OfficialHolidayController {

    private final OfficialHolidayService service;

    public OfficialHolidayController(OfficialHolidayService service) {
        this.service = service;
    }

    @GetMapping
    public List<OfficialHolidayDto> list() {
        return service.list().stream().map(OfficialHolidayDto::from).toList();
    }

    @PutMapping("/{date}")
    public OfficialHolidayDto save(
        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestBody SaveOfficialHolidayRequest request
    ) {
        return OfficialHolidayDto.from(service.save(date, request.name()));
    }

    @DeleteMapping("/{date}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        service.delete(date);
    }
}
