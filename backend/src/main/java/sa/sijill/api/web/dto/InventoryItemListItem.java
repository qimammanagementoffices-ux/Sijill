package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.InventoryItem;

public record InventoryItemListItem(
        UUID id,
        String code,
        String nameAr,
        String nameEn,
        LocalizedRef category,
        int quantity,
        long quantityRequested,
        int minQuantity,
        boolean lowStock,
        String unit,
        LocalDate dateAdded,
        BigDecimal lastPurchasePrice,
        String imageUrl,
        boolean active) {

    // imageUrl comes from the attachments table, so it is looked up in bulk
    // by the caller (one query per page) rather than per row.
    public static InventoryItemListItem from(InventoryItem item, String imageUrl, long quantityRequested) {
        InventoryItemListItem base = from(item);
        return new InventoryItemListItem(
                base.id(),
                base.code(),
                base.nameAr(),
                base.nameEn(),
                base.category(),
                base.quantity(),
                quantityRequested,
                base.minQuantity(),
                base.lowStock(),
                base.unit(),
                base.dateAdded(),
                base.lastPurchasePrice(),
                imageUrl,
                base.active());
    }

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
                0,
                item.getMinQuantity(),
                item.isLowStock(),
                item.getUnit(),
                item.getDateAdded(),
                item.getLastPurchasePrice(),
                null,
                item.isActive());
    }
}
