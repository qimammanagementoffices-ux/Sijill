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
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(defaultValue = "false") boolean underReview,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal Employee actor) {
        UUID restrictToRequesterId = mine || !hasPermission(actor, "mt.view") ? actor.getId() : null;
        Page<MaintenanceRequest> page =
                maintenanceRequestService.search(status, restrictToRequesterId, q, archived, underReview, actor, pageable);
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
    public MaintenanceRequestDetail approve(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.approve(id, request, actor));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('mt.act.reject')")
    public MaintenanceRequestDetail reject(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.reject(id, request, actor));
    }

    @PostMapping("/{id}/postpone")
    @PreAuthorize("hasAuthority('mt.act.postpone')")
    public MaintenanceRequestDetail postpone(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.postpone(id, request, actor));
    }

    @PostMapping("/{id}/countersign")
    @PreAuthorize("hasAuthority('mt.act.countersign')")
    public MaintenanceRequestDetail countersign(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.countersign(id, request, actor));
    }

    @PostMapping("/{id}/overturn")
    @PreAuthorize("hasAuthority('mt.act.countersign')")
    public MaintenanceRequestDetail overturn(
            @PathVariable UUID id,
            @RequestBody(required = false) OverturnRequest request,
            @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.overturn(id, request, actor));
    }

    // The requester's own step -- gated by ownership in the service.
    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyAuthority('mt.request', 'mt.view')")
    public MaintenanceRequestDetail receive(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.receive(id, actor));
    }

    @PostMapping("/{id}/reject-receipt")
    @PreAuthorize("hasAnyAuthority('mt.request', 'mt.view')")
    public MaintenanceRequestDetail rejectReceipt(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.rejectReceipt(id, request, actor));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('emp.manage')")
    public MaintenanceRequestDetail archive(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.archive(id, actor));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('emp.manage')")
    public MaintenanceRequestDetail restore(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return MaintenanceRequestDetail.from(maintenanceRequestService.restore(id, actor));
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
