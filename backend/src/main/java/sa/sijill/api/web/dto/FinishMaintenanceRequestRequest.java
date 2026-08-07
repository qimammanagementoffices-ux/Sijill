package sa.sijill.api.web.dto;

import java.util.List;

public record FinishMaintenanceRequestRequest(List<PartUsedRequest> partsUsed) {}
