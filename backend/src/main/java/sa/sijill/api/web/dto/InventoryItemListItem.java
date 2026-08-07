package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.InventoryItem;

public record InventoryItemListItem(
        UUID id,
        String code,
        String nameAr,
        String nameEn,
        LocalizedRef category,
        int quantity,
        int minQuantity,
        boolean lowStock,
        String unit,
        boolean active) {

    public static InventoryItemListItem from(InventoryItem item) {
        return new InventoryItemListItem(
                item.getId(),
                item.getCode(),
                item.getNameAr(),
                item.getNameEn(),
                item.getCategory() == null
                        ? null
                        : new LocalizedRef(
                                item.getCategory().getId(), item.getCategory().getNameAr(), item.getCategory().getNameEn()),
                item.getQuantity(),
                item.getMinQuantity(),
                item.isLowStock(),
                item.getUnit(),
                item.isActive());
    }
}
