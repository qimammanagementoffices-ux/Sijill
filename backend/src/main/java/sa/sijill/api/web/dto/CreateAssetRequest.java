package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.AssetStatus;

// No assetNumber field: server-assigned from asset_number_seq.
public record CreateAssetRequest(
        String nameAr,
        String nameEn,
        UUID categoryId,
        UUID roomId,
        UUID custodianId,
        AssetStatus status,
        LocalDate acquisitionDate,
        BigDecimal acquisitionCost,
        String vendor,
        String notes,
        String nameHi,
        BigDecimal depreciationRate,
        BigDecimal accumulatedDepreciation,
        BigDecimal periodEndBalance,
        LocalDate periodEndDate) {}
