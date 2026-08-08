package sa.sijill.api.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.MaintenanceService;
import sa.sijill.api.web.dto.MaintenanceDto;
import sa.sijill.api.web.dto.UpdateMaintenanceRequest;

@RestController
@RequestMapping("/api/v1/maintenance")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    // Public — the maintenance page itself, and the root layout's pre-render
    // check, need this before any auth exists (same reasoning as branding).
    @GetMapping
    public MaintenanceDto get() {
        return MaintenanceDto.from(maintenanceService.get());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('sys.maintenance')")
    public MaintenanceDto update(@RequestBody UpdateMaintenanceRequest request) {
        return MaintenanceDto.from(maintenanceService.update(request));
    }
}
