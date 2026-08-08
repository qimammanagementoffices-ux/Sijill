package sa.sijill.api.web;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.repository.PermissionRepository;
import sa.sijill.api.web.dto.PermissionDto;
import sa.sijill.api.web.dto.PermissionOverviewDto;

@RestController
@RequestMapping("/api/v1/permissions")
public class PermissionController {

    private final PermissionRepository permissionRepository;

    public PermissionController(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('emp.manage')")
    public List<PermissionDto> list() {
        return permissionRepository.findAll().stream().map(PermissionDto::from).toList();
    }

    // How many active employees currently hold each permission -- read-only
    // summary matrix, same gate as the list endpoint above since both are
    // employee-permission administration views.
    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('emp.manage')")
    public List<PermissionOverviewDto> overview() {
        return permissionRepository.countActiveEmployeesByPermission().stream()
                .map(PermissionOverviewDto::from)
                .toList();
    }
}
