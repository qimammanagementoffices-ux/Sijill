package sa.sijill.api.web.dto;

import java.time.Instant;
import sa.sijill.api.domain.MaintenanceRequestAction;

public record MaintenanceRequestActionDto(String actorName, String action, String reason, Instant createdAt) {

    public static MaintenanceRequestActionDto from(MaintenanceRequestAction action) {
        return new MaintenanceRequestActionDto(
                // Null actor means the system acted, not an employee.
                action.getActor() == null ? null : action.getActor().getName(),
                action.getAction(),
                action.getReason(),
                action.getCreatedAt());
    }
}
