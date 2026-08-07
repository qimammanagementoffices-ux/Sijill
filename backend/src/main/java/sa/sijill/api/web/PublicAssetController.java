package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.service.AssetService;
import sa.sijill.api.web.dto.PublicAssetDto;

// Unauthenticated (see SecurityConfig's permitAll allowlist). Token-addressed
// per docs/decision-record.md D2 — never the asset id or asset number.
// Returns only the allowlisted PublicAssetDto projection, never AssetDetail.
@RestController
@RequestMapping("/api/v1/public/assets")
public class PublicAssetController {

    private final AssetService assetService;
    private final AttachmentRepository attachmentRepository;

    public PublicAssetController(AssetService assetService, AttachmentRepository attachmentRepository) {
        this.assetService = assetService;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping("/{token}")
    public PublicAssetDto get(@PathVariable UUID token) {
        Asset asset = assetService.getByPublicToken(token);
        // D2: one representative photo only, not the full gallery.
        String photoUrl = attachmentRepository
                .findFirstByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(AttachmentOwnerType.ASSET, asset.getId())
                .map(a -> a.getUrl())
                .orElse(null);
        return PublicAssetDto.from(asset, photoUrl);
    }
}
