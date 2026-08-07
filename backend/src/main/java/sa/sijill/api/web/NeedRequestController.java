package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.service.NeedRequestService;
import sa.sijill.api.web.dto.*;

@RestController
@RequestMapping("/api/v1/warehouse/requests")
public class NeedRequestController {

    private final NeedRequestService needRequestService;

    public NeedRequestController(NeedRequestService needRequestService) {
        this.needRequestService = needRequestService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('wh.view', 'wh.request')")
    public PagedResponse<NeedRequestListItem> search(
            @RequestParam(required = false) NeedRequestStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal Employee actor) {
        UUID restrictToRequesterId = hasPermission(actor, "wh.view") ? null : actor.getId();
        Page<NeedRequest> page = needRequestService.search(status, restrictToRequesterId, pageable);
        return PagedResponse.from(page, NeedRequestListItem::from);
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
