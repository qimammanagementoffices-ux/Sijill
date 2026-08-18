package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.InventoryItem;

/** Minimum catalogue data needed to select an item on a need request. */
public record InventoryRequestOption(
        UUID id,
        String code,
        String nameAr,
        String nameEn,
        LocalizedRef category,
        int quantity,
        String unit,
        String imageUrl,
        boolean active) {

    public static InventoryRequestOption from(InventoryItem item, String imageUrl) {
        return new InventoryRequestOption(
                item.getId(),
                item.getCode(),
                item.getNameAr(),
                item.getNameEn(),
                item.getCategory() == null ? null : LocalizedRef.from(item.getCategory()),
                item.getQuantity(),
                item.getUnit(),
                imageUrl,
                item.isActive());
    }
}
