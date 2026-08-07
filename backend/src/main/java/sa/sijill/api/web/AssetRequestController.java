package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.AssetRequest;
import sa.sijill.api.domain.AssetRequestStatus;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.service.AssetRequestService;
import sa.sijill.api.web.dto.*;

@RestController
@RequestMapping("/api/v1/asset-requests")
public class AssetRequestController {

    private final AssetRequestService assetRequestService;

    public AssetRequestController(AssetRequestService assetRequestService) {
        this.assetRequestService = assetRequestService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public PagedResponse<AssetRequestListItem> search(
            @RequestParam(required = false) AssetRequestStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal Employee actor) {
        UUID restrictToRequesterId = hasPermission(actor, "as.view") ? null : actor.getId();
        Page<AssetRequest> page = assetRequestService.search(status, restrictToRequesterId, pageable);
        return PagedResponse.from(page, AssetRequestListItem::from);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public AssetRequestDetail get(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        AssetRequest request = assetRequestService.get(id);
        requireOwnerOrView(request, actor);
        return AssetRequestDetail.from(request);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('as.request')")
    public AssetRequestDetail submit(
            @RequestBody SubmitAssetRequestRequest request, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.submit(request, actor));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('as.act.approve')")
    public AssetRequestDetail approve(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.approve(id, actor));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('as.act.reject')")
    public AssetRequestDetail reject(
            @PathVariable UUID id, @RequestBody(required = false) ActionReasonRequest request, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(
                assetRequestService.reject(id, request != null ? request.reason() : null, actor));
    }

    @PostMapping("/{id}/postpone")
    @PreAuthorize("hasAuthority('as.act.postpone')")
    public AssetRequestDetail postpone(
            @PathVariable UUID id, @RequestBody(required = false) ActionReasonRequest request, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(
                assetRequestService.postpone(id, request != null ? request.reason() : null, actor));
    }

    @PostMapping("/{id}/finish")
    @PreAuthorize("hasAuthority('as.act.finish')")
    public AssetRequestDetail finish(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.finish(id, actor));
    }

    private void requireOwnerOrView(AssetRequest request, Employee actor) {
        if (hasPermission(actor, "as.view")) return;
        if (!request.getRequester().getId().equals(actor.getId())) {
            throw ApiException.forbidden("You do not have permission to view this request");
        }
    }

    private boolean hasPermission(Employee employee, String key) {
        return employee.getPermissions().stream().map(Permission::getKey).anyMatch(key::equals);
    }
}
