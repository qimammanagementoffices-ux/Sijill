package sa.sijill.api.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetTransfer;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Room;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.AssetTransferRepository;
import sa.sijill.api.repository.RoomRepository;

// Room/custody changes only ever go through here, so every move is captured
// in asset_transfer history — AssetService.update deliberately has no
// roomId/custodianId fields to keep that invariant.
@Service
public class AssetTransferService {

    private final AssetTransferRepository assetTransferRepository;
    private final AssetRepository assetRepository;
    private final RoomRepository roomRepository;
    private final AuditService auditService;

    public AssetTransferService(
            AssetTransferRepository assetTransferRepository,
            AssetRepository assetRepository,
            RoomRepository roomRepository,
            AuditService auditService) {
        this.assetTransferRepository = assetTransferRepository;
        this.assetRepository = assetRepository;
        this.roomRepository = roomRepository;
        this.auditService = auditService;
    }

    public List<AssetTransfer> history(UUID assetId) {
        return assetTransferRepository.findByAssetIdOrderByCreatedAtDesc(assetId);
    }

    @Transactional
    public Asset transfer(UUID assetId, UUID toRoomId, Employee toEmployee, String reason, Employee actor) {
        Asset asset = assetRepository.findById(assetId).orElseThrow(() -> ApiException.notFound("Asset not found"));
        Room toRoom = toRoomId == null
                ? asset.getRoom()
                : roomRepository.findById(toRoomId).orElseThrow(() -> ApiException.notFound("Room not found"));

        AssetTransfer transfer = new AssetTransfer();
        transfer.setAsset(asset);
        transfer.setFromRoom(asset.getRoom());
        transfer.setToRoom(toRoom);
        transfer.setFromEmployee(asset.getCustodian());
        transfer.setToEmployee(toEmployee);
        transfer.setActor(actor);
        transfer.setReason(reason);
        assetTransferRepository.save(transfer);

        asset.setRoom(toRoom);
        asset.setCustodian(toEmployee);
        Asset saved = assetRepository.save(asset);
        auditService.record(actor, "ASSET_TRANSFERRED", "Asset", saved.getId());
        return saved;
    }
}
