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
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal Employee actor) {
        UUID restrictToRequesterId = mine || !hasPermission(actor, "wh.view") ? actor.getId() : null;
        Page<NeedRequest> page = needRequestService.search(status, restrictToRequesterId, q, pageable);
        Set<UUID> ids = page.getContent().stream().map(NeedRequest::getId).collect(Collectors.toSet());
        Map<UUID, List<Attachment>> attachments = ids.isEmpty()
                ? Map.of()
                : attachmentRepository.findByOwnerTypeAndOwnerIdIn(AttachmentOwnerType.NEED_REQUEST, ids).stream()
                        .sorted(Comparator.comparing(Attachment::getCreatedAt))
                        .collect(Collectors.groupingBy(Attachment::getOwnerId));
        return PagedResponse.from(page, request ->
                NeedRequestListItem.from(request, attachments.getOrDefault(request.getId(), List.of())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('wh.view', 'wh.request')")
    public NeedRequestDetail get(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        NeedRequest request = needRequestService.get(id);
        requireOwnerOrView(request, actor);
        return NeedRequestDetail.from(request);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.request')")
    public NeedRequestDetail submit(
            @RequestBody CreateNeedRequestRequest request, @AuthenticationPrincipal Employee actor) {
        return NeedRequestDetail.from(needRequestService.submit(request, actor));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('wh.act.approve')")
    public NeedRequestDetail approve(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return NeedRequestDetail.from(needRequestService.approve(id, actor));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('wh.act.reject')")
    public NeedRequestDetail reject(
            @PathVariable UUID id, @RequestBody(required = false) ActionReasonRequest request, @AuthenticationPrincipal Employee actor) {
        return NeedRequestDetail.from(needRequestService.reject(id, request != null ? request.reason() : null, actor));
    }

    @PostMapping("/{id}/postpone")
    @PreAuthorize("hasAuthority('wh.act.postpone')")
    public NeedRequestDetail postpone(
            @PathVariable UUID id, @RequestBody(required = false) ActionReasonRequest request, @AuthenticationPrincipal Employee actor) {
        return NeedRequestDetail.from(needRequestService.postpone(id, request != null ? request.reason() : null, actor));
    }

    @PostMapping("/{id}/finish")
    @PreAuthorize("hasAuthority('wh.act.finish')")
    public NeedRequestDetail finish(
            @PathVariable UUID id, @RequestBody(required = false) FinishNeedRequestRequest request, @AuthenticationPrincipal Employee actor) {
        return NeedRequestDetail.from(needRequestService.finish(id, request, actor));
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
