package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.FaultTypeService;
import sa.sijill.api.web.dto.FaultTypeDto;
import sa.sijill.api.web.dto.UpsertFaultTypeRequest;

@RestController
@RequestMapping("/api/v1/maintenance/fault-types")
public class FaultTypeController {

    private final FaultTypeService faultTypeService;

    public FaultTypeController(FaultTypeService faultTypeService) {
        this.faultTypeService = faultTypeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('mt.view', 'mt.request')")
    public List<FaultTypeDto> list() {
        return faultTypeService.list().stream().map(FaultTypeDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.items')")
    public FaultTypeDto create(@RequestBody UpsertFaultTypeRequest request) {
        return FaultTypeDto.from(faultTypeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('wh.items')")
    public FaultTypeDto update(@PathVariable UUID id, @RequestBody UpsertFaultTypeRequest request) {
        return FaultTypeDto.from(faultTypeService.update(id, request));
    }
}
