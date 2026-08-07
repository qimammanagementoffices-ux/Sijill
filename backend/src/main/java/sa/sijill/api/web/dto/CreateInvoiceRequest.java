package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateInvoiceRequest(
        String invoiceNumber, LocalDate invoiceDate, String vendor, BigDecimal taxRate, List<InvoiceLineRequest> lines) {}
