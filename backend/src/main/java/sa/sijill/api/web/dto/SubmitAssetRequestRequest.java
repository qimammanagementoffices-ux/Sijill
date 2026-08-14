package sa.sijill.api.web.dto;

import java.util.UUID;
import java.util.List;
import sa.sijill.api.domain.AssetRequestPriority;
import sa.sijill.api.domain.AssetRequestPurpose;

public record SubmitAssetRequestRequest(
        UUID assetId,
        String reason,
        UUID departmentId,
        UUID roomId,
        AssetRequestPurpose purpose,
        AssetRequestPriority priority,
        UUID destinationRoomId,
        List<AssetRequestLineRequest> lines) {

    public SubmitAssetRequestRequest(UUID assetId, String reason) {
        this(assetId, reason, null, null, null, null, null, List.of());
    }
}
