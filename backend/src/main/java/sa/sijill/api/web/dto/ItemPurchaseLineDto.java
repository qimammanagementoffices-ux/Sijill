package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.PurchaseInvoiceLine;

// One purchase of a single item, for the item card's invoice history.
public record ItemPurchaseLineDto(
        UUID invoiceId,
        String invoiceNumber,
        LocalDate invoiceDate,
        String vendor,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal) {

    public static ItemPurchaseLineDto from(PurchaseInvoiceLine line) {
        return new ItemPurchaseLineDto(
                line.getInvoice().getId(),
                line.getInvoice().getInvoiceNumber(),
                line.getInvoice().getInvoiceDate(),
                line.getInvoice().getVendor(),
                line.getQuantity(),
                line.getUnitPrice(),
                line.getLineTotal());
    }
}
