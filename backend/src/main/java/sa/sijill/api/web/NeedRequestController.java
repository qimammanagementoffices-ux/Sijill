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
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.service.NeedRequestService;
import sa.sijill.api.web.dto.*;

@RestController
@RequestMapping("/api/v1/warehouse/requests")
public class NeedRequestController {

    private final NeedRequestService needRequestService;
    private final AttachmentRepository attachmentRepository;

    public NeedRequestController(NeedRequestService needRequestService, AttachmentRepository attachmentRepository) {
        this.needRequestService = needRequestService;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('wh.view', 'wh.request')")
    public PagedResponse<NeedRequestListItem> search(
            @RequestParam(required = false) NeedRequestStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "false") boolean archived,
            // The counter-signer's queue: both under-review states at once.
            @RequestParam(defaultValue = "false") boolean underReview,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal Employee actor) {
        UUID restrictToRequesterId = mine || !hasPermission(actor, "wh.view") ? actor.getId() : null;
        Page<NeedRequest> page =
                needRequestService.search(status, restrictToRequesterId, q, archived, underReview, pageable);
        Set<UUID> ids = page.getContent().stream().map(NeedRequest::getId).collect(Collectors.toSet());
        Map<UUID, List<Attachment>> attachments = attachmentsByRequest(AttachmentOwnerType.NEED_REQUEST, ids);
        // Proof of delivery is kept apart from the requester's own evidence so
        // the card can label each for what it is.
        Map<UUID, List<Attachment>> deliveryAttachments =
                attachmentsByRequest(AttachmentOwnerType.NEED_REQUEST_DELIVERY, ids);
        return PagedResponse.from(page, request -> NeedRequestListItem.from(
                request,
                attachments.getOrDefault(request.getId(), List.of()),
                deliveryAttachments.getOrDefault(request.getId(), List.of()),
                actor));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('wh.view', 'wh.request')")
    public NeedRequestDetail get(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        NeedRequest request = needRequestService.get(id);
        requireOwnerOrView(request, actor);
        return NeedRequestDetail.from(request, actor);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.request')")
    public NeedRequestDetail submit(
            @RequestBody CreateNeedRequestRequest request, @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.submit(request, actor), actor);
    }

    // The requester's one-hour edit window, or an admin on a still-pending
    // request. The service is the authority on both -- never the browser clock.
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('wh.request', 'emp.manage')")
    public NeedRequestDetail update(
            @PathVariable UUID id,
            @RequestBody CreateNeedRequestRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.update(id, request, actor), actor);
    }

    // --- First-level decisions ---

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('wh.act.approve')")
    public NeedRequestDetail approve(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.approve(id, request, actor), actor);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('wh.act.reject')")
    public NeedRequestDetail reject(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.reject(id, request, actor), actor);
    }

    @PostMapping("/{id}/postpone")
    @PreAuthorize("hasAuthority('wh.act.postpone')")
    public NeedRequestDetail postpone(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.postpone(id, request, actor), actor);
    }

    // --- Second-level review ---

    @PostMapping("/{id}/countersign")
    @PreAuthorize("hasAuthority('wh.act.countersign')")
    public NeedRequestDetail countersign(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.countersign(id, request, actor), actor);
    }

    @PostMapping("/{id}/overturn")
    @PreAuthorize("hasAuthority('wh.act.countersign')")
    public NeedRequestDetail overturn(
            @PathVariable UUID id,
            @RequestBody(required = false) OverturnRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.overturn(id, request, actor), actor);
    }

    // --- Delivery and receipt ---

    @PostMapping("/{id}/finish")
    @PreAuthorize("hasAuthority('wh.act.finish')")
    public NeedRequestDetail finish(
            @PathVariable UUID id,
            @RequestBody(required = false) FinishNeedRequestRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.finish(id, request, actor), actor);
    }

    // Writes off an undelivered remainder instead of leaving a short-delivered
    // request open forever. Same permission as delivering it.
    @PostMapping("/{id}/cancel-remainder")
    @PreAuthorize("hasAuthority('wh.act.finish')")
    public NeedRequestDetail cancelRemainder(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.cancelRemainder(id, request, actor), actor);
    }

    // Receipt is the requester's own step -- gated by ownership in the
    // service, not by a permission key.
    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyAuthority('wh.request', 'wh.view')")
    public NeedRequestDetail receive(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.receive(id, actor), actor);
    }

    @PostMapping("/{id}/reject-receipt")
    @PreAuthorize("hasAnyAuthority('wh.request', 'wh.view')")
    public NeedRequestDetail rejectReceipt(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.rejectReceipt(id, request, actor), actor);
    }

    // --- Archive (never delete: workflow rule 4) ---

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('emp.manage')")
    public NeedRequestDetail archive(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return detail(needRequestService.archive(id, actor), actor);
    }

    private Map<UUID, List<Attachment>> attachmentsByRequest(AttachmentOwnerType ownerType, Set<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return attachmentRepository.findByOwnerTypeAndOwnerIdIn(ownerType, ids).stream()
                .sorted(Comparator.comparing(Attachment::getCreatedAt))
                .collect(Collectors.groupingBy(Attachment::getOwnerId));
    }

    private NeedRequestDetail detail(NeedRequest request, Employee actor) {
        return NeedRequestDetail.from(request, actor);
    }

    private void requireOwnerOrView(NeedRequest request, Employee actor) {
        if (hasPermission(actor, "wh.view")) return;
        if (!request.getRequester().getId().equals(actor.getId())) {
            throw ApiException.forbidden("You do not have permission to view this request");
        }
    }

    private boolean hasPermission(Employee employee, String key) {
        return employee.getPermissions().stream().map(Permission::getKey).anyMatch(key::equals);
    }
}
