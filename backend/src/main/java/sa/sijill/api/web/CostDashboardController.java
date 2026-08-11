package sa.sijill.api.web;

import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.service.CostDashboardService;
import sa.sijill.api.web.dto.CostDashboardDto;

@RestController
@RequestMapping("/api/v1/costs")
public class CostDashboardController {
    private final CostDashboardService service;

    public CostDashboardController(CostDashboardService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('wh.costs')")
    public CostDashboardDto dashboard(
            @RequestParam(defaultValue = "warehouse") String domain,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.dashboard(domain, from, to);
    }
}
