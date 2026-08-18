package sa.sijill.api.web;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.domain.AssetRequestStatus;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.MaintenancePriority;
import sa.sijill.api.domain.MaintenanceRequestStatus;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.AssetRequestRepository;
import sa.sijill.api.repository.InventoryItemRepository;
import sa.sijill.api.repository.MaintenanceRequestRepository;
import sa.sijill.api.repository.NeedRequestRepository;
import sa.sijill.api.repository.RoomRepository;
import sa.sijill.api.service.DepartmentScopeService;
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
    private final DepartmentScopeService departmentScopeService;

    public DashboardController(
            InventoryItemRepository inventoryItemRepository,
            NeedRequestRepository needRequestRepository,
            MaintenanceRequestRepository maintenanceRequestRepository,
            RoomRepository roomRepository,
            AssetRepository assetRepository,
            AssetRequestRepository assetRequestRepository,
            DepartmentScopeService departmentScopeService) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.needRequestRepository = needRequestRepository;
        this.maintenanceRequestRepository = maintenanceRequestRepository;
        this.roomRepository = roomRepository;
        this.assetRepository = assetRepository;
        this.assetRequestRepository = assetRequestRepository;
        this.departmentScopeService = departmentScopeService;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('emp.manage')")
    public DashboardStatsDto stats(@AuthenticationPrincipal Employee actor) {
        Set<UUID> scope = departmentScopeService.scopeFor(actor);
        boolean unscoped = scope == null;
        Set<UUID> departmentIds = unscoped || scope.isEmpty() ? Set.of(new UUID(0, 0)) : scope;
        LocalDate today = LocalDate.now();
        var countPage = PageRequest.of(0, 1);

        Long warehousePending = hasAnyPermission(
                        actor,
                        "wh.view", "wh.act.approve", "wh.act.reject", "wh.act.postpone",
                        "wh.act.finish", "wh.act.countersign")
                ? needRequestRepository.search(
                                NeedRequestStatus.PENDING,
                                null,
                                null,
                                false,
                                false,
                                today,
                                departmentIds,
                                unscoped,
                                actor.getId(),
                                countPage)
                        .getTotalElements()
                : null;
        var warehouse = hasAnyPermission(actor, "wh.view", "wh.items", "wh.qty") ? new DashboardStatsDto.Warehouse(
                inventoryItemRepository.countByDomain(Domain.WAREHOUSE),
                inventoryItemRepository.sumQuantityByDomain(Domain.WAREHOUSE),
                inventoryItemRepository.countLowStockByDomain(Domain.WAREHOUSE),
                warehousePending) : null;

        var maintenance = hasAnyPermission(actor, "mt.view") ? new DashboardStatsDto.Maintenance(
                maintenanceCount(MaintenanceRequestStatus.PENDING, actor, today, departmentIds, unscoped, countPage),
                maintenanceCount(MaintenanceRequestStatus.IN_PROGRESS, actor, today, departmentIds, unscoped, countPage),
                maintenanceCount(MaintenanceRequestStatus.CLOSED, actor, today, departmentIds, unscoped, countPage),
                maintenanceRequestRepository.countByPriorityAndStatusNotInScope(
                        MaintenancePriority.URGENT,
                        MaintenanceRequestStatus.CLOSED,
                        departmentIds,
                        unscoped,
                        actor.getId())) : null;

        Long assetPending = hasAnyPermission(
                        actor,
                        "as.view", "as.act.approve", "as.act.reject", "as.act.postpone",
                        "as.act.finish", "as.act.countersign")
                ? assetRequestRepository.search(
                                AssetRequestStatus.PENDING,
                                null,
                                null,
                                false,
                                false,
                                today,
                                departmentIds,
                                unscoped,
                                actor.getId(),
                                countPage)
                        .getTotalElements()
                : null;
        var assets = hasAnyPermission(actor, "as.view", "as.manage") ? new DashboardStatsDto.Assets(
                roomRepository.count(), assetRepository.count(), assetPending) : null;

        return new DashboardStatsDto(warehouse, maintenance, assets);
    }

    private boolean hasAnyPermission(Employee employee, String... keys) {
        var accepted = java.util.Set.of(keys);
        return employee.getPermissions().stream().anyMatch(permission -> accepted.contains(permission.getKey()));
    }

    private long maintenanceCount(
            MaintenanceRequestStatus status,
            Employee actor,
            LocalDate today,
            Set<UUID> departmentIds,
            boolean unscoped,
            PageRequest countPage) {
        return maintenanceRequestRepository.search(
                        status,
                        null,
                        null,
                        false,
                        false,
                        today,
                        departmentIds,
                        unscoped,
                        actor.getId(),
                        countPage)
                .getTotalElements();
    }
}
