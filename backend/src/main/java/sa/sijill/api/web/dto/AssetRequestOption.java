package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetStatus;

/** Minimum asset data needed by the asset-request picker. */
public record AssetRequestOption(
        UUID id,
        String assetNumber,
        String nameAr,
        String nameEn,
        LocalizedRef category,
        LocalizedRef room,
        AssetStatus status) {

    public static AssetRequestOption from(Asset asset) {
        return new AssetRequestOption(
                asset.getId(),
                asset.getAssetNumber(),
                asset.getNameAr(),
                asset.getNameEn(),
                asset.getCategory() == null ? null : LocalizedRef.from(asset.getCategory()),
                asset.getRoom() == null ? null : LocalizedRef.from(asset.getRoom()),
                asset.getStatus());
    }
}
