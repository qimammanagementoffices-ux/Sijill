package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.AssetRequest;

public record AssetRequestListItem(
        UUID id,
        UUID requesterId,
        String requesterName,
        String assetNumber,
        String assetNameAr,
        String assetNameEn,
        LocalizedRef department,
        String reason,
        String status,
        LocalDate suggestedStartDate,
        List<AssetRequestActionDto> actions) {

    public static AssetRequestListItem from(AssetRequest request) {
        LocalizedRef department = request.getAsset().getRoom() == null
                        || request.getAsset().getRoom().getDepartment() == null
                ? null
                : LocalizedRef.from(request.getAsset().getRoom().getDepartment());
        return new AssetRequestListItem(
                request.getId(),
                request.getRequester().getId(),
                request.getRequester().getName(),
                request.getAsset().getAssetNumber(),
                request.getAsset().getNameAr(),
                request.getAsset().getNameEn(),
                department,
                request.getReason(),
                request.getStatus().name(),
                request.getSuggestedStartDate(),
                request.getActions().stream().map(AssetRequestActionDto::from).toList());
    }
}
