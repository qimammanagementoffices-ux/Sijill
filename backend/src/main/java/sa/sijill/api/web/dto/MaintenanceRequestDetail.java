package sa.sijill.api.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.MaintenanceRequest;
import sa.sijill.api.service.MaintenanceRequestService;

public record MaintenanceRequestDetail(
        UUID id,
        UUID requesterId,
        String requesterName,
        LocalizedRef department,
        LocalizedRef faultType,
        String location,
        String priority,
        String description,
        String status,
        LocalDate suggestedStartDate,
        LocalDate postponedUntil,
        boolean returnedBySenior,
        Instant archivedAt,
        List<PartUsedDto> partsUsed,
        List<MaintenanceRequestActionDto> actions,
        int version) {

    public static MaintenanceRequestDetail from(MaintenanceRequest request) {
        return new MaintenanceRequestDetail(
                request.getId(),
                request.getRequester().getId(),
                request.getRequester().getName(),
                request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment()),
                request.getFaultType() == null
                        ? null
                        : new LocalizedRef(
                                request.getFaultType().getId(),
                                request.getFaultType().getNameAr(),
                                request.getFaultType().getNameEn()),
                request.getLocation(),
                request.getPriority().name(),
                request.getDescription(),
                MaintenanceRequestService.effectiveStatus(request).name(),
                request.getSuggestedStartDate(),
                request.getPostponedUntil(),
                request.isReturnedBySenior(),
                request.getArchivedAt(),
                request.getPartsUsed().stream().map(PartUsedDto::from).toList(),
                request.getActions().stream().map(MaintenanceRequestActionDto::from).toList(),
                request.getVersion());
    }
}
