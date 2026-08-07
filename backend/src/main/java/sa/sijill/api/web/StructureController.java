package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.StructureService;
import sa.sijill.api.web.dto.LocalizedEntityDto;
import sa.sijill.api.web.dto.UpsertLocalizedEntityRequest;

@RestController
public class StructureController {

    private final StructureService structureService;

    public StructureController(StructureService structureService) {
        this.structureService = structureService;
    }

    @GetMapping("/api/v1/departments")
    public List<LocalizedEntityDto> listDepartments() {
        return structureService.listDepartments().stream().map(LocalizedEntityDto::from).toList();
    }

    @PostMapping("/api/v1/departments")
    @PreAuthorize("hasAuthority('emp.structure')")
    public LocalizedEntityDto createDepartment(@RequestBody UpsertLocalizedEntityRequest request) {
        return LocalizedEntityDto.from(structureService.createDepartment(request));
    }

    @PutMapping("/api/v1/departments/{id}")
    @PreAuthorize("hasAuthority('emp.structure')")
    public LocalizedEntityDto updateDepartment(@PathVariable UUID id, @RequestBody UpsertLocalizedEntityRequest request) {
        return LocalizedEntityDto.from(structureService.updateDepartment(id, request));
    }

    @GetMapping("/api/v1/job-titles")
    public List<LocalizedEntityDto> listJobTitles() {
        return structureService.listJobTitles().stream().map(LocalizedEntityDto::from).toList();
    }

    @PostMapping("/api/v1/job-titles")
    @PreAuthorize("hasAuthority('emp.structure')")
    public LocalizedEntityDto createJobTitle(@RequestBody UpsertLocalizedEntityRequest request) {
        return LocalizedEntityDto.from(structureService.createJobTitle(request));
    }

    @PutMapping("/api/v1/job-titles/{id}")
    @PreAuthorize("hasAuthority('emp.structure')")
    public LocalizedEntityDto updateJobTitle(@PathVariable UUID id, @RequestBody UpsertLocalizedEntityRequest request) {
        return LocalizedEntityDto.from(structureService.updateJobTitle(id, request));
    }
}
