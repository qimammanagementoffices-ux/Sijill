package sa.sijill.api.web.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.AssetRequest;
import sa.sijill.api.service.AssetRequestService;

public record AssetRequestDetail(
        UUID id,
        long requestNumber,
        UUID requesterId,
        String requesterName,
        UUID assetId,
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
        boolean returnedBySenior,
        Instant archivedAt,
        List<AssetRequestLineDto> lines,
        List<AssetRequestActionDto> actions,
        List<AttachmentDto> attachments,
        int version) {

    public static AssetRequestDetail from(AssetRequest request) {
        return from(request, List.of());
    }

    public static AssetRequestDetail from(AssetRequest request, List<AttachmentDto> attachments) {
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
        return new AssetRequestDetail(
                request.getId(),
                request.getRequestNumber(),
                request.getRequester().getId(),
                request.getRequester().getName(),
                request.getAsset() == null ? null : request.getAsset().getId(),
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
                request.isReturnedBySenior(),
                request.getArchivedAt(),
                lines,
                request.getActions().stream().map(AssetRequestActionDto::from).toList(),
                attachments,
                request.getVersion());
    }
}
