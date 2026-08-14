package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.AssetRequestLine;

public record AssetRequestLineDto(
        UUID id,
        UUID assetId,
        String assetNumber,
        String assetNameAr,
        String assetNameEn,
        UUID categoryId,
        String categoryNameAr,
        String categoryNameEn,
        int quantity) {

    public static AssetRequestLineDto from(AssetRequestLine line) {
        return new AssetRequestLineDto(
                line.getId(),
                line.getAsset() == null ? null : line.getAsset().getId(),
                line.getAsset() == null ? null : line.getAsset().getAssetNumber(),
                line.getAsset() == null ? null : line.getAsset().getNameAr(),
                line.getAsset() == null ? null : line.getAsset().getNameEn(),
                line.getCategory() == null ? null : line.getCategory().getId(),
                line.getCategory() == null ? null : line.getCategory().getNameAr(),
                line.getCategory() == null ? null : line.getCategory().getNameEn(),
                line.getQuantity());
    }
}
