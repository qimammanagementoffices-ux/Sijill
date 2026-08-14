package sa.sijill.api.web.dto;

import java.util.List;

// notes is the finish modal's "ملاحظات" field, recorded on the FINISH action.
public record FinishMaintenanceRequestRequest(List<PartUsedRequest> partsUsed, String notes) {}
