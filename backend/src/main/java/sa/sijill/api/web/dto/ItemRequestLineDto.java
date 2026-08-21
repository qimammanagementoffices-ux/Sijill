package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.UUID;
import sa.sijill.api.domain.NeedRequestLine;

// One need-request line for a single item, for the item card's request
// history. NeedRequest has no number or request date of its own -- it is
// identified by id and ordered by createdAt.
//
// quantityRequested carries the effective quantity -- the approved one where
// an approver set it -- so the card never reports a superseded ask.
public record ItemRequestLineDto(
        UUID requestId,
        Instant createdAt,
        String status,
        String requesterName,
        String departmentName,
        int quantityRequested,
        Integer quantityIssued) {

    public static ItemRequestLineDto from(NeedRequestLine line) {
        return new ItemRequestLineDto(
                line.getNeedRequest().getId(),
                line.getNeedRequest().getCreatedAt(),
                line.getNeedRequest().getStatus().name(),
                line.getNeedRequest().getRequester() == null
                        ? null
                        : line.getNeedRequest().getRequester().getName(),
                line.getNeedRequest().getDepartment() == null
                        ? null
                        : LocalizedRef.from(line.getNeedRequest().getDepartment()).ar(),
                // The approved figure once a decision trimmed the line: what the
                // card should show is what this item is actually down for, not
                // the ask it started as.
                line.effectiveQuantity(),
                line.getQuantityIssued());
    }
}
