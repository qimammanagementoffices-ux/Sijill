package sa.sijill.api.web.dto;

import java.util.UUID;

public record TransferAssetRequest(UUID toRoomId, UUID toEmployeeId, String reason) {}
