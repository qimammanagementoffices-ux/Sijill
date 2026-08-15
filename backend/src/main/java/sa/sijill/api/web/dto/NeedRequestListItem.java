package sa.sijill.api.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.service.NeedRequestService;

// Carries the request's lines because the list renders cards, not rows: each
// card shows what was asked for ("مياه شرب × 2") without a detail fetch per
// card. NeedRequest.lines is already loaded with the aggregate, so this adds
// no query.
public record NeedRequestListItem(
        UUID id,
        UUID requesterId,
        String requesterName,
        // For the printed form's "المسمى الوظيفي" cell, which had no source
        // and always printed a dash.
        String requesterJobTitle,
        LocalizedRef department,
        LocalizedRef category,
        String status,
        LocalDate suggestedStartDate,
        LocalDate postponedUntil,
        Instant editableUntil,
        boolean canEdit,
        boolean returnedBySenior,
        Instant archivedAt,
        String notes,
        List<NeedRequestLineDto> lines,
        List<NeedRequestActionDto> actions,
        List<AttachmentDto> attachments,
        List<AttachmentDto> deliveryAttachments) {

    public static NeedRequestListItem from(
            NeedRequest request,
            List<Attachment> attachments,
            List<Attachment> deliveryAttachments,
            Employee actor) {
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
                request.getRequester().getId(),
                request.getRequester().getName(),
                request.getRequester().getJobTitle() == null
                        ? null
                        : request.getRequester().getJobTitle().getNameAr(),
                request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment()),
                category == null ? null : LocalizedRef.from(category),
                // Effective, not stored: a postponed request whose date has
                // arrived reads as pending everywhere.
                NeedRequestService.effectiveStatus(request).name(),
                request.getSuggestedStartDate(),
                request.getPostponedUntil(),
                NeedRequestService.editableUntil(request),
                NeedRequestService.canEdit(request, actor),
                request.isReturnedBySenior(),
                request.getArchivedAt(),
                request.getNotes(),
                request.getLines().stream().map(NeedRequestLineDto::from).toList(),
                request.getActions().stream().map(NeedRequestActionDto::from).toList(),
                attachments.stream().map(AttachmentDto::from).toList(),
                deliveryAttachments.stream().map(AttachmentDto::from).toList());
    }
}
