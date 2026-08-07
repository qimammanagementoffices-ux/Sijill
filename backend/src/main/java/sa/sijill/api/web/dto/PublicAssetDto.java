package sa.sijill.api.web.dto;

import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetStatus;

// Dedicated read-only public projection per docs/decision-record.md D2 —
// never reuse AssetDetail here. Allowlisted fields only: asset number,
// localized name, category, status, room. No cost/vendor/notes/custodian/
// history/photos-gallery.
public record PublicAssetDto(
        String assetNumber, String nameAr, String nameEn, LocalizedRef category, LocalizedRef room, AssetStatus status) {

    public static PublicAssetDto from(Asset asset) {
        return new PublicAssetDto(
                asset.getAssetNumber(),
                asset.getNameAr(),
                asset.getNameEn(),
                asset.getCategory() == null ? null : LocalizedRef.from(asset.getCategory()),
                asset.getRoom() == null ? null : LocalizedRef.from(asset.getRoom()),
                asset.getStatus());
    }
}
