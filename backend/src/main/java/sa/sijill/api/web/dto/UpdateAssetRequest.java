package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.AssetStatus;

// Deliberately no roomId/custodianId here — location/custody changes only
// happen through AssetTransferService so every change is recorded in
// asset_transfer history. Editing this DTO's fields never moves an asset.
public record UpdateAssetRequest(
        String nameAr,
        String nameEn,
        UUID categoryId,
        AssetStatus status,
        LocalDate acquisitionDate,
        BigDecimal acquisitionCost,
        String vendor,
        String notes,
        int version) {}
