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
import sa.sijill.api.service.AttachmentService;
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

    public AttachmentController(AttachmentService attachmentService, AttachmentRepository attachmentRepository) {
        this.attachmentService = attachmentService;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping
    public List<AttachmentDto> list(
            @RequestParam AttachmentOwnerType ownerType, @RequestParam UUID ownerId, @AuthenticationPrincipal Employee actor) {
        requirePermission(actor, viewPermissionFor(ownerType, ownerId));
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
        }
        return AttachmentDto.from(attachmentService.upload(ownerType, ownerId, file, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        Attachment attachment =
                attachmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Attachment not found"));
        if (!isSelfPhoto(attachment.getOwnerType(), attachment.getOwnerId(), actor)) {
            requirePermission(actor, managePermissionFor(attachment.getOwnerType(), attachment.getOwnerId()));
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
            case INVENTORY_ITEM -> List.of("wh.view");
            case WAREHOUSE_INVOICE -> List.of("wh.invoices");
            case ROOM, ASSET, ASSET_ACQUISITION -> List.of("as.view");
            case BRANDING -> List.of("sys.branding");
            case MAINTENANCE -> isMaintenanceSetting(ownerId)
                    ? List.of("sys.maintenance")
                    : List.of("mt.view", "mt.request");
            case EMPLOYEE -> List.of("emp.view");
            case NEED_REQUEST -> List.of("wh.view", "wh.request");
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
        };
    }

    private boolean isMaintenanceSetting(UUID ownerId) {
        return MAINTENANCE_SETTING_OWNER_ID.equals(ownerId);
    }

    private void requirePermission(Employee employee, List<String> anyOfKeys) {
        boolean hasIt = employee.getPermissions().stream().map(Permission::getKey).anyMatch(anyOfKeys::contains);
        if (!hasIt) {
            throw ApiException.forbidden("You do not have permission to manage attachments for this item");
        }
    }
}
