package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import sa.sijill.api.domain.DiscountType;

public record CreateInvoiceRequest(
        String invoiceNumber,
        LocalDate invoiceDate,
        String vendor,
        BigDecimal taxRate,
        DiscountType discountType,
        BigDecimal discountValue,
        List<InvoiceLineRequest> lines) {

    public CreateInvoiceRequest(
            String invoiceNumber,
            LocalDate invoiceDate,
            String vendor,
            BigDecimal taxRate,
            List<InvoiceLineRequest> lines) {
        this(invoiceNumber, invoiceDate, vendor, taxRate, DiscountType.FIXED, BigDecimal.ZERO, lines);
    }
}
