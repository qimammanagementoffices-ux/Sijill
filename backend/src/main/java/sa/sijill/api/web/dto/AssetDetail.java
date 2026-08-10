package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetStatus;

public record AssetDetail(
        UUID id,
        String assetNumber,
        String nameAr,
        String nameEn,
        String nameHi,
        LocalizedRef category,
        LocalizedRef room,
        UUID custodianId,
        String custodianName,
        AssetStatus status,
        LocalDate acquisitionDate,
        BigDecimal acquisitionCost,
        String vendor,
        String notes,
        BigDecimal depreciationRate,
        BigDecimal accumulatedDepreciation,
        BigDecimal periodEndBalance,
        LocalDate periodEndDate,
        UUID publicToken,
        int version) {

    public static AssetDetail from(Asset asset) {
        return new AssetDetail(
                asset.getId(),
                asset.getAssetNumber(),
                asset.getNameAr(),
                asset.getNameEn(),
                asset.getNameHi(),
                asset.getCategory() == null ? null : LocalizedRef.from(asset.getCategory()),
                asset.getRoom() == null ? null : LocalizedRef.from(asset.getRoom()),
                asset.getCustodian() == null ? null : asset.getCustodian().getId(),
                asset.getCustodian() == null ? null : asset.getCustodian().getName(),
                asset.getStatus(),
                asset.getAcquisitionDate(),
                asset.getAcquisitionCost(),
                asset.getVendor(),
                asset.getNotes(),
                asset.getDepreciationRate(),
                asset.getAccumulatedDepreciation(),
                asset.getPeriodEndBalance(),
                asset.getPeriodEndDate(),
                asset.getPublicToken(),
                asset.getVersion());
    }
}
