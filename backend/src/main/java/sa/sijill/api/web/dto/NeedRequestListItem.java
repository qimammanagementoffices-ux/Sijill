package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestAction;

// Carries the request's lines because the list renders cards, not rows: each
// card shows what was asked for ("مياه شرب × 2") without a detail fetch per
// card. NeedRequest.lines is already loaded with the aggregate, so this adds
// no query.
public record NeedRequestListItem(
        UUID id,
        String requesterName,
        LocalizedRef department,
        LocalizedRef category,
        String status,
        LocalDate suggestedStartDate,
        String notes,
        List<NeedRequestLineDto> lines,
        List<NeedRequestActionDto> actions,
        List<AttachmentDto> attachments) {

    public static NeedRequestListItem from(NeedRequest request, List<Attachment> attachments) {
        Category category = request.getCategory();
        if (category == null) {
            category = request.getLines().stream()
                    .map(line -> line.getInventoryItem())
                    .filter(Objects::nonNull)
                    .map(item -> item.getCategory())
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
        }

        return new NeedRequestListItem(
                request.getId(),
                request.getRequester().getName(),
                request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment()),
                category == null ? null : LocalizedRef.from(category),
                request.getStatus().name(),
                request.getSuggestedStartDate(),
                request.getNotes(),
                request.getLines().stream().map(NeedRequestLineDto::from).toList(),
                request.getActions().stream()
                        .sorted(Comparator.comparing(NeedRequestAction::getCreatedAt))
                        .map(NeedRequestActionDto::from)
                        .toList(),
                attachments.stream().map(AttachmentDto::from).toList());
    }
}
