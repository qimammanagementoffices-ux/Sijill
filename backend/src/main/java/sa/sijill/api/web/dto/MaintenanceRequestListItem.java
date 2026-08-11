package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.MaintenanceRequest;
import sa.sijill.api.domain.MaintenanceRequestAction;

public record MaintenanceRequestListItem(
        UUID id,
        String requesterName,
        LocalizedRef department,
        LocalizedRef faultType,
        String priority,
        String status,
        LocalDate suggestedStartDate,
        String location,
        String description,
        List<MaintenanceRequestActionDto> actions,
        List<AttachmentDto> attachments) {

    public static MaintenanceRequestListItem from(MaintenanceRequest request, List<Attachment> attachments) {
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
                request.getSuggestedStartDate(),
                request.getLocation(),
                request.getDescription(),
                request.getActions().stream()
                        .sorted(Comparator.comparing(MaintenanceRequestAction::getCreatedAt))
                        .map(MaintenanceRequestActionDto::from)
                        .toList(),
                attachments.stream().map(AttachmentDto::from).toList());
    }
}
