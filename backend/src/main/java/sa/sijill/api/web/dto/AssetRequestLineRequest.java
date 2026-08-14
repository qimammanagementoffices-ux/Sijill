package sa.sijill.api.web.dto;

import java.util.UUID;

public record AssetRequestLineRequest(UUID assetId, UUID categoryId, int quantity) {}
