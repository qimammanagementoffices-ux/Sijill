package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.NeedRequestLine;

public record NeedRequestLineDto(
        UUID id,
        UUID inventoryItemId,
        String itemCode,
        String itemNameAr,
        String itemNameEn,
        // On-hand stock and unit, so the delivery modal can show
        // "الرصيد المتاح: 15 علبة" without a lookup per line. The item is
        // already loaded with the request, so this costs no query.
        int itemQuantity,
        String itemUnit,
        int quantityRequested,
        Integer quantityApproved,
        boolean removed,
        Integer quantityIssued) {

    public static NeedRequestLineDto from(NeedRequestLine line) {
        return new NeedRequestLineDto(
                line.getId(),
                line.getInventoryItem().getId(),
                line.getInventoryItem().getCode(),
                line.getInventoryItem().getNameAr(),
                line.getInventoryItem().getNameEn(),
                line.getInventoryItem().getQuantity(),
                line.getInventoryItem().getUnit(),
                line.getQuantityRequested(),
                line.getQuantityApproved(),
                line.isRemoved(),
                line.getQuantityIssued());
    }
}
