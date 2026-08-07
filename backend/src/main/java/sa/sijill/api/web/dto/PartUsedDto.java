package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.MaintenanceRequestPartUsed;

public record PartUsedDto(UUID inventoryItemId, String itemCode, String itemNameAr, String itemNameEn, int quantity) {

    public static PartUsedDto from(MaintenanceRequestPartUsed partUsed) {
        return new PartUsedDto(
                partUsed.getInventoryItem().getId(),
                partUsed.getInventoryItem().getCode(),
                partUsed.getInventoryItem().getNameAr(),
                partUsed.getInventoryItem().getNameEn(),
                partUsed.getQuantity());
    }
}
