package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.UUID;
import sa.sijill.api.domain.NeedRequestLine;

// One need-request line for a single item, for the item card's request
// history. NeedRequest has no number or request date of its own -- it is
// identified by id and ordered by createdAt.
public record ItemRequestLineDto(
        UUID requestId,
        Instant createdAt,
        String status,
        String requesterName,
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
                line.getQuantityRequested(),
                line.getQuantityIssued());
    }
}
