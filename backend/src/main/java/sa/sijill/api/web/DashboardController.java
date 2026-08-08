package sa.sijill.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.domain.AssetRequestStatus;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.MaintenancePriority;
import sa.sijill.api.domain.MaintenanceRequestStatus;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.AssetRequestRepository;
import sa.sijill.api.repository.InventoryItemRepository;
import sa.sijill.api.repository.MaintenanceRequestRepository;
import sa.sijill.api.repository.NeedRequestRepository;
import sa.sijill.api.repository.RoomRepository;
import sa.sijill.api.web.dto.DashboardStatsDto;

// Any authenticated employee can read these -- they're aggregate counts, not
// records, and the frontend only renders the module blocks the viewer
// already has nav access to (same gating as the sidebar).
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final InventoryItemRepository inventoryItemRepository;
    private final NeedRequestRepository needRequestRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final RoomRepository roomRepository;
    private final AssetRepository assetRepository;
    private final AssetRequestRepository assetRequestRepository;

    public DashboardController(
            InventoryItemRepository inventoryItemRepository,
            NeedRequestRepository needRequestRepository,
            MaintenanceRequestRepository maintenanceRequestRepository,
            RoomRepository roomRepository,
            AssetRepository assetRepository,
            AssetRequestRepository assetRequestRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.needRequestRepository = needRequestRepository;
        this.maintenanceRequestRepository = maintenanceRequestRepository;
        this.roomRepository = roomRepository;
        this.assetRepository = assetRepository;
        this.assetRequestRepository = assetRequestRepository;
    }

    @GetMapping("/stats")
    public DashboardStatsDto stats() {
        var warehouse = new DashboardStatsDto.Warehouse(
                inventoryItemRepository.countByDomain(Domain.WAREHOUSE),
                inventoryItemRepository.sumQuantityByDomain(Domain.WAREHOUSE),
                inventoryItemRepository.countLowStockByDomain(Domain.WAREHOUSE),
                needRequestRepository.countByStatus(NeedRequestStatus.PENDING));

        var maintenance = new DashboardStatsDto.Maintenance(
                maintenanceRequestRepository.countByStatus(MaintenanceRequestStatus.PENDING),
                maintenanceRequestRepository.countByStatus(MaintenanceRequestStatus.IN_PROGRESS),
                maintenanceRequestRepository.countByStatus(MaintenanceRequestStatus.CLOSED),
                maintenanceRequestRepository.countByPriorityAndStatusNot(
                        MaintenancePriority.URGENT, MaintenanceRequestStatus.CLOSED));

        var assets = new DashboardStatsDto.Assets(
                roomRepository.count(), assetRepository.count(), assetRequestRepository.countByStatus(AssetRequestStatus.PENDING));

        return new DashboardStatsDto(warehouse, maintenance, assets);
    }
}
