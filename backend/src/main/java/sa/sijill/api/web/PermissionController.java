package sa.sijill.api.web;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.repository.PermissionRepository;
import sa.sijill.api.web.dto.PermissionDto;

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
}
