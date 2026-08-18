package sa.sijill.api.web;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.repository.AuditLogRepository;
import sa.sijill.api.web.dto.AuditLogDto;
import sa.sijill.api.web.dto.PagedResponse;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('sys.audit.view')")
    public PagedResponse<AuditLogDto> list(
            @PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC)
                    Pageable pageable) {
        return PagedResponse.from(auditLogRepository.findAll(pageable), AuditLogDto::from);
    }
}
