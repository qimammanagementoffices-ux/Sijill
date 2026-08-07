package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.AssetRequest;

public record AssetRequestListItem(
        UUID id,
        String requesterName,
        String assetNumber,
        String assetNameAr,
        String assetNameEn,
        String status,
        LocalDate suggestedStartDate) {

    public static AssetRequestListItem from(AssetRequest request) {
        return new AssetRequestListItem(
                request.getId(),
                request.getRequester().getName(),
                request.getAsset().getAssetNumber(),
                request.getAsset().getNameAr(),
                request.getAsset().getNameEn(),
                request.getStatus().name(),
                request.getSuggestedStartDate());
    }
}
