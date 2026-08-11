package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.AssetAcquisition;

public record AssetAcquisitionDto(UUID id, String documentNumber, LocalDate documentDate, String vendor,
        BigDecimal amount, String notes, List<AssetRef> assets, int version) {
    public static AssetAcquisitionDto from(AssetAcquisition acquisition) {
        return new AssetAcquisitionDto(acquisition.getId(), acquisition.getDocumentNumber(), acquisition.getDocumentDate(),
                acquisition.getVendor(), acquisition.getAmount(), acquisition.getNotes(),
                acquisition.getAssets().stream().map(AssetRef::from).toList(), acquisition.getVersion());
    }
    public record AssetRef(UUID id, String assetNumber, String nameAr, String nameEn) {
        static AssetRef from(sa.sijill.api.domain.Asset asset) {
            return new AssetRef(asset.getId(), asset.getAssetNumber(), asset.getNameAr(), asset.getNameEn());
        }
    }
}
