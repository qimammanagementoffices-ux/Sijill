package sa.sijill.api.web.dto;

import java.util.UUID;

public record SubmitAssetRequestRequest(UUID assetId, String reason) {}
