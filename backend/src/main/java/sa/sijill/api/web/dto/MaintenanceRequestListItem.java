package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.MaintenanceRequest;

public record MaintenanceRequestListItem(
        UUID id,
        String requesterName,
        LocalizedRef department,
        LocalizedRef faultType,
        String priority,
        String status,
        LocalDate suggestedStartDate) {

    public static MaintenanceRequestListItem from(MaintenanceRequest request) {
        return new MaintenanceRequestListItem(
                request.getId(),
                request.getRequester().getName(),
                request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment()),
                request.getFaultType() == null
                        ? null
                        : new LocalizedRef(
                                request.getFaultType().getId(),
                                request.getFaultType().getNameAr(),
                                request.getFaultType().getNameEn()),
                request.getPriority().name(),
                request.getStatus().name(),
                request.getSuggestedStartDate());
    }
}
