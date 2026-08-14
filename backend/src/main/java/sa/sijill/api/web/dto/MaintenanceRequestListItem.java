package sa.sijill.api.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.MaintenanceRequest;
import sa.sijill.api.service.MaintenanceRequestService;

public record MaintenanceRequestListItem(
        UUID id,
        UUID requesterId,
        String requesterName,
        LocalizedRef department,
        LocalizedRef faultType,
        String priority,
        String status,
        LocalDate suggestedStartDate,
        LocalDate postponedUntil,
        boolean returnedBySenior,
        Instant archivedAt,
        String location,
        String description,
        List<MaintenanceRequestActionDto> actions,
        List<AttachmentDto> attachments) {

    public static MaintenanceRequestListItem from(MaintenanceRequest request, List<Attachment> attachments) {
        return new MaintenanceRequestListItem(
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
                request.getPriority().name(),
                // Effective, not stored: a postponed request whose date has
                // arrived reads as pending everywhere.
                MaintenanceRequestService.effectiveStatus(request).name(),
                request.getSuggestedStartDate(),
                request.getPostponedUntil(),
                request.isReturnedBySenior(),
                request.getArchivedAt(),
                request.getLocation(),
                request.getDescription(),
                request.getActions().stream().map(MaintenanceRequestActionDto::from).toList(),
                attachments.stream().map(AttachmentDto::from).toList());
    }
}
