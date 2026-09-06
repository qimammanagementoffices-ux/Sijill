package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.DiscountType;
import sa.sijill.api.domain.PurchaseInvoice;

public record InvoiceDetail(
        UUID id,
        String invoiceNumber,
        LocalDate invoiceDate,
        String vendor,
        BigDecimal taxRate,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal gross,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal discountTotal,
        BigDecimal total,
        List<InvoiceLineDto> lines,
        int version) {

    public static InvoiceDetail from(PurchaseInvoice invoice) {
        BigDecimal sub = invoice.getSubtotal() != null ? invoice.getSubtotal() : BigDecimal.ZERO;
        BigDecimal tax = invoice.getTaxTotal() != null ? invoice.getTaxTotal() : BigDecimal.ZERO;
        BigDecimal gross = sub.add(tax);
        return new InvoiceDetail(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getVendor(),
                invoice.getTaxRate(),
                invoice.getSubtotal(),
                invoice.getTaxTotal(),
                gross,
                invoice.getDiscountType() != null ? invoice.getDiscountType() : DiscountType.FIXED,
                invoice.getDiscountValue() != null ? invoice.getDiscountValue() : BigDecimal.ZERO,
                invoice.getDiscountTotal() != null ? invoice.getDiscountTotal() : BigDecimal.ZERO,
                invoice.getTotal(),
                invoice.getLines().stream().map(InvoiceLineDto::from).toList(),
                invoice.getVersion());
    }
}
