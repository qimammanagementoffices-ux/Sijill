package sa.sijill.api.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.service.NeedRequestService;

public record NeedRequestDetail(
        UUID id,
        UUID requesterId,
        String requesterName,
        LocalizedRef department,
        LocalizedRef category,
        LocalizedRef room,
        String notes,
        String status,
        LocalDate suggestedStartDate,
        LocalDate postponedUntil,
        Instant editableUntil,
        boolean canEdit,
        boolean returnedBySenior,
        Instant archivedAt,
        List<NeedRequestLineDto> lines,
        List<NeedRequestActionDto> actions,
        int version) {

    public static NeedRequestDetail from(NeedRequest request, Employee actor) {
        return new NeedRequestDetail(
                request.getId(),
                request.getRequester().getId(),
                request.getRequester().getName(),
                request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment()),
                request.getCategory() == null
                        ? null
                        : new LocalizedRef(
                                request.getCategory().getId(),
                                request.getCategory().getNameAr(),
                                request.getCategory().getNameEn()),
                request.getRoom() == null ? null : LocalizedRef.from(request.getRoom()),
                request.getNotes(),
                NeedRequestService.effectiveStatus(request).name(),
                request.getSuggestedStartDate(),
                request.getPostponedUntil(),
                NeedRequestService.editableUntil(request),
                NeedRequestService.canEdit(request, actor),
                request.isReturnedBySenior(),
                request.getArchivedAt(),
                request.getLines().stream().map(NeedRequestLineDto::from).toList(),
                request.getActions().stream().map(NeedRequestActionDto::from).toList(),
                request.getVersion());
    }
}
