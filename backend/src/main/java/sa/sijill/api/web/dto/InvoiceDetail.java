package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.PurchaseInvoice;

public record InvoiceDetail(
        UUID id,
        String invoiceNumber,
        LocalDate invoiceDate,
        String vendor,
        BigDecimal taxRate,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal total,
        List<InvoiceLineDto> lines,
        int version) {

    public static InvoiceDetail from(PurchaseInvoice invoice) {
        return new InvoiceDetail(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getVendor(),
                invoice.getTaxRate(),
                invoice.getSubtotal(),
                invoice.getTaxTotal(),
                invoice.getTotal(),
                invoice.getLines().stream().map(InvoiceLineDto::from).toList(),
                invoice.getVersion());
    }
}
