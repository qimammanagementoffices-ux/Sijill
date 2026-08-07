package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateInventoryItemRequest(
        String nameAr, String nameEn, UUID categoryId, String unit, BigDecimal weight, int minQuantity, int version) {}
