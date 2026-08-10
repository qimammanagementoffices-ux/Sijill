package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

// No code field: the server assigns it from a per-domain sequence
// (V63__code_sequences.sql), so a client cannot pick or collide with one.
public record CreateInventoryItemRequest(
        String nameAr,
        String nameEn,
        UUID categoryId,
        String unit,
        BigDecimal weight,
        LocalDate dateAdded,
        int minQuantity,
        // Opening stock. Only settable at creation -- afterwards quantity
        // moves through invoices and issues, never a direct edit.
        int quantity,
        String nameHi) {}
