package sa.sijill.api.web.dto;

import java.time.Instant;
import sa.sijill.api.domain.AssetTransfer;

public record AssetTransferDto(
        LocalizedRef fromRoom,
        LocalizedRef toRoom,
        String fromEmployeeName,
        String toEmployeeName,
        String actorName,
        String reason,
        Instant createdAt) {

    public static AssetTransferDto from(AssetTransfer transfer) {
        return new AssetTransferDto(
                transfer.getFromRoom() == null ? null : LocalizedRef.from(transfer.getFromRoom()),
                transfer.getToRoom() == null ? null : LocalizedRef.from(transfer.getToRoom()),
                transfer.getFromEmployee() == null ? null : transfer.getFromEmployee().getName(),
                transfer.getToEmployee() == null ? null : transfer.getToEmployee().getName(),
                transfer.getActor().getName(),
                transfer.getReason(),
                transfer.getCreatedAt());
    }
}
