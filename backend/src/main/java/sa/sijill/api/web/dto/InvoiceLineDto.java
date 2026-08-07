package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.util.UUID;
import sa.sijill.api.domain.PurchaseInvoiceLine;

public record InvoiceLineDto(
        UUID inventoryItemId, String itemCode, String itemNameAr, String itemNameEn, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {

    public static InvoiceLineDto from(PurchaseInvoiceLine line) {
        return new InvoiceLineDto(
                line.getInventoryItem().getId(),
                line.getInventoryItem().getCode(),
                line.getInventoryItem().getNameAr(),
                line.getInventoryItem().getNameEn(),
                line.getQuantity(),
                line.getUnitPrice(),
                line.getLineTotal());
    }
}
