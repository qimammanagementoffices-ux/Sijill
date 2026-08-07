package sa.sijill.api.web.dto;

import java.util.UUID;

public record NeedRequestLineRequest(UUID inventoryItemId, int quantityRequested) {}
