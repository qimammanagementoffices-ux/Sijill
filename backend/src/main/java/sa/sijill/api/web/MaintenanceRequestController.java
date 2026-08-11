package sa.sijill.api.web;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.MaintenanceRequest;
import sa.sijill.api.domain.MaintenanceRequestStatus;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.service.MaintenanceRequestService;
import sa.sijill.api.web.dto.*;

@RestController
@RequestMapping("/api/v1/maintenance/requests")
public class MaintenanceRequestController {

    private final MaintenanceRequestService maintenanceRequestService;
    private final AttachmentRepository attachmentRepository;

    public MaintenanceRequestController(
            MaintenanceRequestService maintenanceRequestService, AttachmentRepository attachmentRepository) {
        this.maintenanceRequestService = maintenanceRequestService;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('mt.view', 'mt.request')")
    public PagedResponse<MaintenanceRequestListItem> search(
            @RequestParam(required = false) MaintenanceRequestStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal Employee actor) {
        UUID restrictToRequesterId = hasPermission(actor, "mt.view") ? null : actor.getId();
        Page<MaintenanceRequest> page = maintenanceRequestService.search(status, restrictToRequesterId, pageable);
        Set<UUID> ids = page.getContent().stream().map(MaintenanceRequest::getId).collect(Collectors.toSet());
        Map<UUID, List<Attachment>> attachments = ids.isEmpty()
                ? Map.of()
                : attachmentRepository.findByOwnerTypeAndOwnerIdIn(AttachmentOwnerType.MAINTENANCE, ids).stream()
                        .sorted(Comparator.comparing(Attachment::getCreatedAt))
                        .collect(Collectors.groupingBy(Attachment::getOwnerId));
        return PagedResponse.from(page, request ->
                MaintenanceRequestListItem.from(request, attachments.getOrDefault(request.getId(), List.of())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('mt.view', 'mt.request')")
    public MaintenanceRequestDetail get(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        MaintenanceRequest request = maintenanceRequestService.get(id);
        requireOwnerOrView(request, actor);
        return MaintenanceRequestDetail.from(request);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('mt.request')")
    public MaintenanceRequestDetail submit(
            @RequestBody SubmitMaintenanceRequestRequest request, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.submit(request, actor));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('mt.act.approve')")
    public MaintenanceRequestDetail approve(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.approve(id, actor));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('mt.act.reject')")
    public MaintenanceRequestDetail reject(
            @PathVariable UUID id, @RequestBody(required = false) ActionReasonRequest request, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(
                maintenanceRequestService.reject(id, request != null ? request.reason() : null, actor));
    }

    @PostMapping("/{id}/postpone")
    @PreAuthorize("hasAuthority('mt.act.postpone')")
    public MaintenanceRequestDetail postpone(
            @PathVariable UUID id, @RequestBody(required = false) ActionReasonRequest request, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(
                maintenanceRequestService.postpone(id, request != null ? request.reason() : null, actor));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAuthority('mt.act.start')")
    public MaintenanceRequestDetail start(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.start(id, actor));
    }

    @PostMapping("/{id}/finish")
    @PreAuthorize("hasAuthority('mt.act.finish')")
    public MaintenanceRequestDetail finish(
            @PathVariable UUID id, @RequestBody(required = false) FinishMaintenanceRequestRequest request, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.finish(id, request, actor));
    }

    private void requireOwnerOrView(MaintenanceRequest request, Employee actor) {
        if (hasPermission(actor, "mt.view")) return;
        if (!request.getRequester().getId().equals(actor.getId())) {
            throw ApiException.forbidden("You do not have permission to view this request");
        }
    }

    private boolean hasPermission(Employee employee, String key) {
        return employee.getPermissions().stream().map(Permission::getKey).anyMatch(key::equals);
    }
}
