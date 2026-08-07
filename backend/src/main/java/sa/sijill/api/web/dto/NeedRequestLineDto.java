package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.NeedRequestLine;

public record NeedRequestLineDto(
        UUID id, UUID inventoryItemId, String itemCode, String itemNameAr, String itemNameEn, int quantityRequested, Integer quantityIssued) {

    public static NeedRequestLineDto from(NeedRequestLine line) {
        return new NeedRequestLineDto(
                line.getId(),
                line.getInventoryItem().getId(),
                line.getInventoryItem().getCode(),
                line.getInventoryItem().getNameAr(),
                line.getInventoryItem().getNameEn(),
                line.getQuantityRequested(),
                line.getQuantityIssued());
    }
}
