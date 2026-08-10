package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetStatus;

public record AssetListItem(
        UUID id,
        String assetNumber,
        String nameAr,
        String nameEn,
        LocalizedRef category,
        LocalizedRef room,
        String custodianName,
        AssetStatus status,
        String thumbnailUrl) {

    public static AssetListItem from(Asset asset) {
        return from(asset, null);
    }

    public static AssetListItem from(Asset asset, String thumbnailUrl) {
        return new AssetListItem(
                asset.getId(),
                asset.getAssetNumber(),
                asset.getNameAr(),
                asset.getNameEn(),
                asset.getCategory() == null ? null : LocalizedRef.from(asset.getCategory()),
                asset.getRoom() == null ? null : LocalizedRef.from(asset.getRoom()),
                asset.getCustodian() == null ? null : asset.getCustodian().getName(),
                asset.getStatus(),
                thumbnailUrl);
    }
}
