package sa.sijill.api.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.AssetRequest;
import sa.sijill.api.service.AssetRequestService;

public record AssetRequestListItem(
        UUID id,
        long requestNumber,
        UUID requesterId,
        String requesterName,
        String assetNumber,
        String assetNameAr,
        String assetNameEn,
        LocalizedRef department,
        LocalizedRef room,
        LocalizedRef destinationRoom,
        String purpose,
        String priority,
        String reason,
        String status,
        LocalDate suggestedStartDate,
        LocalDate postponedUntil,
        // The requester's one-hour correction window, so the card can offer an
        // edit button for exactly as long as the server will accept one.
        Instant editableUntil,
        boolean canEdit,
        boolean returnedBySenior,
        Instant archivedAt,
        List<AssetRequestLineDto> lines,
        List<AssetRequestActionDto> actions,
        List<AttachmentDto> attachments) {

    public static AssetRequestListItem from(AssetRequest request) {
        return from(request, List.of(), null);
    }

    // A null actor means "nobody in particular is asking" -- canEdit is then
    // false, since the answer depends entirely on who wants to edit.
    public static AssetRequestListItem from(
            AssetRequest request, List<AttachmentDto> attachments, sa.sijill.api.domain.Employee actor) {
        LocalizedRef department = request.getDepartment() != null
                ? LocalizedRef.from(request.getDepartment())
                : request.getAsset() == null
                                || request.getAsset().getRoom() == null
                                || request.getAsset().getRoom().getDepartment() == null
                ? null
                : LocalizedRef.from(request.getAsset().getRoom().getDepartment());
        List<AssetRequestLineDto> lines = request.getLines().stream().map(AssetRequestLineDto::from).toList();
        String assetNumber = lines.stream()
                .map(AssetRequestLineDto::assetNumber)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.joining("، "));
        String assetNameAr = lines.stream()
                .map(line -> line.assetNameAr() != null
                        ? line.assetNameAr()
                        : line.categoryNameAr() + " × " + line.quantity())
                .collect(java.util.stream.Collectors.joining("، "));
        String assetNameEn = lines.stream()
                .map(line -> line.assetNameEn() != null
                        ? line.assetNameEn()
                        : line.categoryNameEn() + " × " + line.quantity())
                .collect(java.util.stream.Collectors.joining(", "));
        if (assetNameAr.isBlank() && request.getAsset() != null) {
            assetNumber = request.getAsset().getAssetNumber();
            assetNameAr = request.getAsset().getNameAr();
            assetNameEn = request.getAsset().getNameEn();
        }
        return new AssetRequestListItem(
                request.getId(),
                request.getRequestNumber(),
                request.getRequester().getId(),
                request.getRequester().getName(),
                assetNumber.isBlank() ? "—" : assetNumber,
                assetNameAr.isBlank() ? "—" : assetNameAr,
                assetNameEn.isBlank() ? "—" : assetNameEn,
                department,
                request.getRoom() == null ? null : LocalizedRef.from(request.getRoom()),
                request.getDestinationRoom() == null ? null : LocalizedRef.from(request.getDestinationRoom()),
                request.getPurpose() == null ? null : request.getPurpose().name(),
                request.getPriority() == null ? null : request.getPriority().name(),
                request.getReason(),
                AssetRequestService.effectiveStatus(request).name(),
                request.getSuggestedStartDate(),
                request.getPostponedUntil(),
                AssetRequestService.editableUntil(request),
                actor != null && AssetRequestService.canEdit(request, actor),
                request.isReturnedBySenior(),
                request.getArchivedAt(),
                lines,
                request.getActions().stream().map(AssetRequestActionDto::from).toList(),
                attachments);
    }
}
