package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceLineRequest(UUID inventoryItemId, int quantity, BigDecimal unitPrice) {}
