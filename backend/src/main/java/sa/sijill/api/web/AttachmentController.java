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

    private final AttachmentService attachmentService;
    private final AttachmentRepository attachmentRepository;

    public AttachmentController(AttachmentService attachmentService, AttachmentRepository attachmentRepository) {
        this.attachmentService = attachmentService;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping
    public List<AttachmentDto> list(
            @RequestParam AttachmentOwnerType ownerType, @RequestParam UUID ownerId, @AuthenticationPrincipal Employee actor) {
        requirePermission(actor, viewPermissionFor(ownerType));
        return attachmentService.list(ownerType, ownerId).stream().map(AttachmentDto::from).toList();
    }

    @PostMapping
    public AttachmentDto upload(
            @RequestParam AttachmentOwnerType ownerType,
            @RequestParam UUID ownerId,
            @RequestParam MultipartFile file,
            @AuthenticationPrincipal Employee actor) {
        requirePermission(actor, managePermissionFor(ownerType));
        return AttachmentDto.from(attachmentService.upload(ownerType, ownerId, file, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        Attachment attachment =
                attachmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Attachment not found"));
        requirePermission(actor, managePermissionFor(attachment.getOwnerType()));
        attachmentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private String viewPermissionFor(AttachmentOwnerType ownerType) {
        return switch (ownerType) {
            case INVENTORY_ITEM -> "wh.view";
            case ROOM, ASSET -> "as.view";
            case BRANDING -> "sys.branding";
            case MAINTENANCE -> "sys.maintenance";
            case EMPLOYEE -> "emp.view";
        };
    }

    private String managePermissionFor(AttachmentOwnerType ownerType) {
        return switch (ownerType) {
            case INVENTORY_ITEM -> "wh.items";
            case ROOM, ASSET -> "as.manage";
            case BRANDING -> "sys.branding";
            case MAINTENANCE -> "sys.maintenance";
            case EMPLOYEE -> "emp.manage";
        };
    }

    private void requirePermission(Employee employee, String key) {
        boolean hasIt = employee.getPermissions().stream().map(Permission::getKey).anyMatch(key::equals);
        if (!hasIt) {
            throw ApiException.forbidden("You do not have permission to manage attachments for this item");
        }
    }
}
