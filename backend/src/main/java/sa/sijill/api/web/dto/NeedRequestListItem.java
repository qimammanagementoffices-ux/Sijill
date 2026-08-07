package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.UUID;
import sa.sijill.api.domain.NeedRequest;

public record NeedRequestListItem(
        UUID id, String requesterName, LocalizedRef department, String status, LocalDate suggestedStartDate) {

    public static NeedRequestListItem from(NeedRequest request) {
        return new NeedRequestListItem(
                request.getId(),
                request.getRequester().getName(),
                request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment()),
                request.getStatus().name(),
                request.getSuggestedStartDate());
    }
}
