package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.NeedRequest;

// Carries the request's lines because the list renders cards, not rows: each
// card shows what was asked for ("مياه شرب × 2") without a detail fetch per
// card. NeedRequest.lines is already loaded with the aggregate, so this adds
// no query.
public record NeedRequestListItem(
        UUID id,
        String requesterName,
        LocalizedRef department,
        String status,
        LocalDate suggestedStartDate,
        String notes,
        List<NeedRequestLineDto> lines) {

    public static NeedRequestListItem from(NeedRequest request) {
        return new NeedRequestListItem(
                request.getId(),
                request.getRequester().getName(),
                request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment()),
                request.getStatus().name(),
                request.getSuggestedStartDate(),
                request.getNotes(),
                request.getLines().stream().map(NeedRequestLineDto::from).toList());
    }
}
