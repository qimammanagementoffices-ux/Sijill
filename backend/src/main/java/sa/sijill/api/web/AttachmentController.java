package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.repository.AssetRequestRepository;
import sa.sijill.api.repository.MaintenanceRequestRepository;
import sa.sijill.api.repository.NeedRequestRepository;
import sa.sijill.api.service.AttachmentService;
import sa.sijill.api.service.DepartmentScopeService;
import sa.sijill.api.web.dto.AttachmentDto;

// No @PreAuthorize here — required permission depends on ownerType (an
// inventory item vs. a room/asset are managed by different roles), so it's
// resolved per-request against the same permission each owning domain's
// own write endpoints already require. No new permission keys needed.
@RestController
@RequestMapping("/api/v1/attachments")
public class AttachmentController {

    private static final UUID MAINTENANCE_SETTING_OWNER_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final AttachmentService attachmentService;
    private final AttachmentRepository attachmentRepository;
    private final NeedRequestRepository needRequestRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final AssetRequestRepository assetRequestRepository;
    private final DepartmentScopeService departmentScopeService;

    public AttachmentController(
            AttachmentService attachmentService,
            AttachmentRepository attachmentRepository,
            NeedRequestRepository needRequestRepository,
            MaintenanceRequestRepository maintenanceRequestRepository,
            AssetRequestRepository assetRequestRepository,
            DepartmentScopeService departmentScopeService) {
        this.attachmentService = attachmentService;
        this.attachmentRepository = attachmentRepository;
        this.needRequestRepository = needRequestRepository;
        this.maintenanceRequestRepository = maintenanceRequestRepository;
        this.assetRequestRepository = assetRequestRepository;
        this.departmentScopeService = departmentScopeService;
    }

    @GetMapping
    public List<AttachmentDto> list(
            @RequestParam AttachmentOwnerType ownerType, @RequestParam UUID ownerId, @AuthenticationPrincipal Employee actor) {
        requirePermission(actor, viewPermissionFor(ownerType, ownerId));
        requireRequestRecordScope(actor, ownerType, ownerId);
        return attachmentService.list(ownerType, ownerId).stream().map(AttachmentDto::from).toList();
    }

    @PostMapping
    public AttachmentDto upload(
            @RequestParam AttachmentOwnerType ownerType,
            @RequestParam UUID ownerId,
            @RequestParam MultipartFile file,
            @AuthenticationPrincipal Employee actor) {
        if (!isSelfPhoto(ownerType, ownerId, actor)) {
            requirePermission(actor, managePermissionFor(ownerType, ownerId));
            requireRequestRecordScope(actor, ownerType, ownerId);
        }
        return AttachmentDto.fromUploaded(attachmentService.upload(ownerType, ownerId, file, actor), actor.getName());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        Attachment attachment =
                attachmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Attachment not found"));
        if (!isSelfPhoto(attachment.getOwnerType(), attachment.getOwnerId(), actor)) {
            requirePermission(actor, managePermissionFor(attachment.getOwnerType(), attachment.getOwnerId()));
            requireRequestRecordScope(actor, attachment.getOwnerType(), attachment.getOwnerId());
        }
        attachmentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Every employee may upload/replace/remove their own profile photo
    // without emp.manage -- this is the one attachment case where the
    // "owner" and the actor can legitimately be the same person editing
    // their own record via PUT /auth/me.
    private boolean isSelfPhoto(AttachmentOwnerType ownerType, UUID ownerId, Employee actor) {
        return ownerType == AttachmentOwnerType.EMPLOYEE && ownerId.equals(actor.getId());
    }

    // NEED_REQUEST accepts either key on both sides: a requester holds only
    // wh.request (they attach quotes/photos to their own request), while an
    // approver holds only wh.view -- mirroring NeedRequestController's
    // hasAnyAuthority('wh.view', 'wh.request') on the request itself.
    private List<String> viewPermissionFor(AttachmentOwnerType ownerType, UUID ownerId) {
        return switch (ownerType) {
            case INVENTORY_ITEM -> List.of("wh.view", "wh.items", "wh.qty");
            case WAREHOUSE_INVOICE -> List.of("wh.invoices", "wh.invoices.edit");
            case ROOM, ASSET, ASSET_ACQUISITION -> List.of("as.view", "as.manage");
            case BRANDING -> List.of("sys.branding");
            case MAINTENANCE -> isMaintenanceSetting(ownerId)
                    ? List.of("sys.maintenance")
                    : List.of("mt.view", "mt.request", "mt.act.approve", "mt.act.reject", "mt.act.postpone",
                            "mt.act.start", "mt.act.finish", "mt.act.countersign");
            case EMPLOYEE -> List.of("emp.view", "emp.manage");
            case NEED_REQUEST, NEED_REQUEST_DELIVERY -> List.of(
                    "wh.view", "wh.request", "wh.act.approve", "wh.act.reject", "wh.act.postpone",
                    "wh.act.finish", "wh.act.countersign");
            case ASSET_REQUEST -> List.of(
                    "as.view", "as.request", "as.act.approve", "as.act.reject", "as.act.postpone",
                    "as.act.finish", "as.act.countersign");
        };
    }

    private List<String> managePermissionFor(AttachmentOwnerType ownerType, UUID ownerId) {
        return switch (ownerType) {
            case INVENTORY_ITEM -> List.of("wh.items");
            case WAREHOUSE_INVOICE -> List.of("wh.invoices.edit");
            case ROOM, ASSET, ASSET_ACQUISITION -> List.of("as.manage");
            case BRANDING -> List.of("sys.branding");
            case MAINTENANCE -> isMaintenanceSetting(ownerId)
                    ? List.of("sys.maintenance")
                    : List.of("mt.view", "mt.request");
            case EMPLOYEE -> List.of("emp.manage");
            case NEED_REQUEST -> List.of("wh.request", "wh.view");
            // Proof of delivery is filed by whoever hands the items over.
            case NEED_REQUEST_DELIVERY -> List.of("wh.act.finish");
            case ASSET_REQUEST -> List.of("as.request", "as.view");
        };
    }

    private boolean isMaintenanceSetting(UUID ownerId) {
        return MAINTENANCE_SETTING_OWNER_ID.equals(ownerId);
    }

    /**
     * Permission keys answer what an employee may do; request ownership and
     * department scope answer which record they may do it to. Keeping this
     * check beside every attachment operation prevents ownerId enumeration
     * from bypassing the request controllers' row-level access rules.
     */
    private void requireRequestRecordScope(Employee actor, AttachmentOwnerType ownerType, UUID ownerId) {
        switch (ownerType) {
            case NEED_REQUEST, NEED_REQUEST_DELIVERY -> {
                var request = needRequestRepository
                        .findById(ownerId)
                        .orElseThrow(() -> ApiException.notFound("Request not found"));
                if (request.getRequester().getId().equals(actor.getId())) return;
                if (hasAnyPermission(actor, List.of(
                                "wh.view", "wh.act.approve", "wh.act.reject", "wh.act.postpone",
                                "wh.act.finish", "wh.act.countersign"))
                        && departmentScopeService.covers(actor, request.getDepartment())) return;
                throw requestRecordForbidden();
            }
            case MAINTENANCE -> {
                if (isMaintenanceSetting(ownerId)) return;
                var request = maintenanceRequestRepository
                        .findById(ownerId)
                        .orElseThrow(() -> ApiException.notFound("Request not found"));
                if (request.getRequester().getId().equals(actor.getId())) return;
                if (hasAnyPermission(actor, List.of(
                                "mt.view", "mt.act.approve", "mt.act.reject", "mt.act.postpone",
                                "mt.act.start", "mt.act.finish", "mt.act.countersign"))
                        && departmentScopeService.covers(actor, request.getDepartment())) return;
                throw requestRecordForbidden();
            }
            case ASSET_REQUEST -> {
                var request = assetRequestRepository
                        .findById(ownerId)
                        .orElseThrow(() -> ApiException.notFound("Request not found"));
                if (request.getRequester().getId().equals(actor.getId())) return;
                if (hasAnyPermission(actor, List.of(
                                "as.view", "as.act.approve", "as.act.reject", "as.act.postpone",
                                "as.act.finish", "as.act.countersign"))
                        && departmentScopeService.covers(actor, request.getDepartment())) return;
                throw requestRecordForbidden();
            }
            default -> {
                // Non-request owners are protected by their domain permission.
            }
        }
    }

    private ApiException requestRecordForbidden() {
        return ApiException.forbidden("You do not have permission to access attachments for this request");
    }

    private boolean hasAnyPermission(Employee employee, List<String> anyOfKeys) {
        return employee.getPermissions().stream().map(Permission::getKey).anyMatch(anyOfKeys::contains);
    }

    private void requirePermission(Employee employee, List<String> anyOfKeys) {
        if (!hasAnyPermission(employee, anyOfKeys)) {
            throw ApiException.forbidden("You do not have permission to manage attachments for this item");
        }
    }
}
