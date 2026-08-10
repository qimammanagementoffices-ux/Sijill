package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.AssetStatus;

public record CreateAssetRequest(
        String assetNumber,
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
        String nameUr) {}
