package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.AssetService;
import sa.sijill.api.web.dto.PublicAssetDto;

// Unauthenticated (see SecurityConfig's permitAll allowlist). Token-addressed
// per docs/decision-record.md D2 — never the asset id or asset number.
// Returns only the allowlisted PublicAssetDto projection, never AssetDetail.
@RestController
@RequestMapping("/api/v1/public/assets")
public class PublicAssetController {

    private final AssetService assetService;

    public PublicAssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping("/{token}")
    public PublicAssetDto get(@PathVariable UUID token) {
        return PublicAssetDto.from(assetService.getByPublicToken(token));
    }
}
