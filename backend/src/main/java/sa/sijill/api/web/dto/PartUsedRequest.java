package sa.sijill.api.web.dto;

import java.util.UUID;

public record PartUsedRequest(UUID inventoryItemId, int quantity) {}
