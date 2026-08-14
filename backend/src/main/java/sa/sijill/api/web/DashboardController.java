package sa.sijill.api.web;

import org.springframework.security.access.prepost.PreAuthorize;
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

// Dashboard aggregates are reserved for administrators. emp.manage is the
// existing authority used for permission administration throughout the app.
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
    @PreAuthorize("hasAuthority('emp.manage')")
    public DashboardStatsDto stats() {
        var warehouse = new DashboardStatsDto.Warehouse(
                inventoryItemRepository.countByDomain(Domain.WAREHOUSE),
                inventoryItemRepository.sumQuantityByDomain(Domain.WAREHOUSE),
                inventoryItemRepository.countLowStockByDomain(Domain.WAREHOUSE),
                needRequestRepository.countByStatus(NeedRequestStatus.PENDING, java.time.LocalDate.now()));

        var maintenance = new DashboardStatsDto.Maintenance(
                maintenanceRequestRepository.countByStatus(MaintenanceRequestStatus.PENDING, java.time.LocalDate.now()),
                maintenanceRequestRepository.countByStatus(MaintenanceRequestStatus.IN_PROGRESS, java.time.LocalDate.now()),
                maintenanceRequestRepository.countByStatus(MaintenanceRequestStatus.CLOSED, java.time.LocalDate.now()),
                maintenanceRequestRepository.countByPriorityAndStatusNot(
                        MaintenancePriority.URGENT, MaintenanceRequestStatus.CLOSED));

        var assets = new DashboardStatsDto.Assets(
                roomRepository.count(), assetRepository.count(), assetRequestRepository.countByStatus(AssetRequestStatus.PENDING, java.time.LocalDate.now()));

        return new DashboardStatsDto(warehouse, maintenance, assets);
    }
}
