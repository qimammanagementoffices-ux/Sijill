package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.NeedRequest;

public record NeedRequestDetail(
        UUID id,
        UUID requesterId,
        String requesterName,
        LocalizedRef department,
        LocalizedRef category,
        String notes,
        String status,
        LocalDate suggestedStartDate,
        List<NeedRequestLineDto> lines,
        List<NeedRequestActionDto> actions,
        int version) {

    public static NeedRequestDetail from(NeedRequest request) {
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
                request.getNotes(),
                request.getStatus().name(),
                request.getSuggestedStartDate(),
                request.getLines().stream().map(NeedRequestLineDto::from).toList(),
                request.getActions().stream().map(NeedRequestActionDto::from).toList(),
                request.getVersion());
    }
}
