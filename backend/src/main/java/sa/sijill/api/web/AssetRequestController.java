package sa.sijill.api.web;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.AssetRequest;
import sa.sijill.api.domain.AssetRequestStatus;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.service.AssetRequestService;
import sa.sijill.api.web.dto.*;

@RestController
@RequestMapping("/api/v1/asset-requests")
public class AssetRequestController {

    private final AssetRequestService assetRequestService;
    private final AttachmentRepository attachmentRepository;

    public AssetRequestController(AssetRequestService assetRequestService, AttachmentRepository attachmentRepository) {
        this.assetRequestService = assetRequestService;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public PagedResponse<AssetRequestListItem> search(
            @RequestParam(required = false) AssetRequestStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(defaultValue = "false") boolean underReview,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal Employee actor) {
        UUID restrictToRequesterId = mine || !hasPermission(actor, "as.view") ? actor.getId() : null;
        Page<AssetRequest> page =
                assetRequestService.search(status, restrictToRequesterId, q, archived, underReview, actor, pageable);
        List<UUID> ids = page.getContent().stream().map(AssetRequest::getId).toList();
        Map<UUID, List<AttachmentDto>> attachments = ids.isEmpty()
                ? Map.of()
                : attachmentRepository.findByOwnerTypeAndOwnerIdIn(AttachmentOwnerType.ASSET_REQUEST, ids).stream()
                        .map(AttachmentDto::from)
                        .collect(Collectors.groupingBy(AttachmentDto::ownerId));
        return PagedResponse.from(
                page, request -> AssetRequestListItem.from(request, attachments.getOrDefault(request.getId(), List.of())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public AssetRequestDetail get(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        AssetRequest request = assetRequestService.get(id);
        requireOwnerOrView(request, actor);
        List<AttachmentDto> attachments = attachmentRepository
                .findByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(AttachmentOwnerType.ASSET_REQUEST, id)
                .stream()
                .map(AttachmentDto::from)
                .toList();
        return AssetRequestDetail.from(request, attachments);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('as.request')")
    public AssetRequestDetail submit(
            @RequestBody SubmitAssetRequestRequest request, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.submit(request, actor));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('as.act.approve')")
    public AssetRequestDetail approve(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.approve(id, request, actor));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('as.act.reject')")
    public AssetRequestDetail reject(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.reject(id, request, actor));
    }

    @PostMapping("/{id}/postpone")
    @PreAuthorize("hasAuthority('as.act.postpone')")
    public AssetRequestDetail postpone(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.postpone(id, request, actor));
    }

    @PostMapping("/{id}/countersign")
    @PreAuthorize("hasAuthority('as.act.countersign')")
    public AssetRequestDetail countersign(
            @PathVariable UUID id,
            @RequestBody(required = false) RequestDecisionRequest request,
            @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.countersign(id, request, actor));
    }

    @PostMapping("/{id}/overturn")
    @PreAuthorize("hasAuthority('as.act.countersign')")
    public AssetRequestDetail overturn(
            @PathVariable UUID id,
            @RequestBody(required = false) OverturnRequest request,
            @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.overturn(id, request, actor));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('emp.manage')")
    public AssetRequestDetail archive(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.archive(id, actor));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('emp.manage')")
    public AssetRequestDetail restore(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        return AssetRequestDetail.from(assetRequestService.restore(id, actor));
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
