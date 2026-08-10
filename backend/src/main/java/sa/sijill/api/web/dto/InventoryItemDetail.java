package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.InventoryItem;

public record InventoryItemDetail(
        UUID id,
        String code,
        String nameAr,
        String nameEn,
        String nameHi,
        LocalizedRef category,
        int quantity,
        String unit,
        BigDecimal weight,
        LocalDate dateAdded,
        int minQuantity,
        boolean lowStock,
        BigDecimal lastPurchasePrice,
        BigDecimal taxRate,
        BigDecimal taxInclusivePrice,
        boolean active,
        int version) {

    public static InventoryItemDetail from(InventoryItem item) {
        return new InventoryItemDetail(
                item.getId(),
                item.getCode(),
                item.getNameAr(),
                item.getNameEn(),
                item.getNameHi(),
                item.getCategory() == null
                        ? null
                        : new LocalizedRef(
                                item.getCategory().getId(), item.getCategory().getNameAr(), item.getCategory().getNameEn()),
                item.getQuantity(),
                item.getUnit(),
                item.getWeight(),
                item.getDateAdded(),
                item.getMinQuantity(),
                item.isLowStock(),
                item.getLastPurchasePrice(),
                item.getTaxRate(),
                item.getTaxInclusivePrice(),
                item.isActive(),
                item.getVersion());
    }
}
