package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.MaintenancePriority;

public record SubmitMaintenanceRequestRequest(
        UUID departmentId, UUID faultTypeId, String location, MaintenancePriority priority, String description) {}
