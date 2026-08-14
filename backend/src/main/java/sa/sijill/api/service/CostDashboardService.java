package sa.sijill.api.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.domain.MaintenanceRequest;
import sa.sijill.api.domain.MaintenanceRequestStatus;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.repository.MaintenanceRequestRepository;
import sa.sijill.api.repository.NeedRequestRepository;
import sa.sijill.api.web.dto.CostBreakdownRow;
import sa.sijill.api.web.dto.CostDashboardDto;
import sa.sijill.api.web.dto.LocalizedRef;

@Service
public class CostDashboardService {
    private final NeedRequestRepository needRequests;
    private final MaintenanceRequestRepository maintenanceRequests;

    public CostDashboardService(NeedRequestRepository needRequests, MaintenanceRequestRepository maintenanceRequests) {
        this.needRequests = needRequests;
        this.maintenanceRequests = maintenanceRequests;
    }

    @Transactional(readOnly = true)
    public CostDashboardDto dashboard(String domain, LocalDate from, LocalDate to) {
        Map<String, NamedTotal> departments = new HashMap<>();
        Map<String, NamedTotal> requesters = new HashMap<>();
        if ("maintenance".equals(domain)) {
            maintenanceRequests.findAll().stream()
                    .filter(r -> (r.getStatus() == MaintenanceRequestStatus.DONE
                                    || r.getStatus() == MaintenanceRequestStatus.CLOSED)
                            && !r.getPartsUsed().isEmpty())
                    .filter(r -> inRange(r.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate(), from, to))
                    .forEach(r -> add(r, maintenanceCost(r), departments, requesters));
        } else {
            needRequests.findAll().stream()
                    .filter(r -> r.getStatus() == NeedRequestStatus.APPROVED
                            || r.getStatus() == NeedRequestStatus.PARTIALLY_DELIVERED
                            || r.getStatus() == NeedRequestStatus.DELIVERED
                            || r.getStatus() == NeedRequestStatus.CLOSED)
                    .filter(r -> inRange(r.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate(), from, to))
                    .forEach(r -> add(r, needCost(r), departments, requesters));
        }
        List<CostBreakdownRow> byDepartment = rows(departments);
        List<CostBreakdownRow> byRequester = rows(requesters);
        BigDecimal total = byRequester.stream().map(CostBreakdownRow::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CostDashboardDto(total, byDepartment, byRequester);
    }

    private BigDecimal needCost(NeedRequest request) {
        return request.getLines().stream()
                .map(line -> price(line.getInventoryItem()).multiply(BigDecimal.valueOf(line.getQuantityRequested())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal maintenanceCost(MaintenanceRequest request) {
        return request.getPartsUsed().stream()
                .map(line -> price(line.getInventoryItem()).multiply(BigDecimal.valueOf(line.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal price(InventoryItem item) {
        if (item.getTaxInclusivePrice() != null) return item.getTaxInclusivePrice();
        return item.getLastPurchasePrice() != null ? item.getLastPurchasePrice() : BigDecimal.ZERO;
    }

    private void add(NeedRequest request, BigDecimal cost, Map<String, NamedTotal> departments, Map<String, NamedTotal> requesters) {
        String departmentId = request.getDepartment() != null ? request.getDepartment().getId().toString() : "none";
        LocalizedRef department = request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment());
        merge(departments, departmentId,
                department != null ? department.ar() : "—",
                department != null ? department.en() : "—", cost);
        merge(requesters, request.getRequester().getId().toString(), request.getRequester().getName(), request.getRequester().getName(), cost);
    }

    private void add(MaintenanceRequest request, BigDecimal cost, Map<String, NamedTotal> departments, Map<String, NamedTotal> requesters) {
        String departmentId = request.getDepartment() != null ? request.getDepartment().getId().toString() : "none";
        LocalizedRef department = request.getDepartment() == null ? null : LocalizedRef.from(request.getDepartment());
        merge(departments, departmentId,
                department != null ? department.ar() : "—",
                department != null ? department.en() : "—", cost);
        merge(requesters, request.getRequester().getId().toString(), request.getRequester().getName(), request.getRequester().getName(), cost);
    }

    private void merge(Map<String, NamedTotal> totals, String key, String ar, String en, BigDecimal amount) {
        totals.compute(key, (ignored, current) -> current == null
                ? new NamedTotal(ar, en, amount)
                : new NamedTotal(current.ar(), current.en(), current.total().add(amount)));
    }

    private List<CostBreakdownRow> rows(Map<String, NamedTotal> totals) {
        return totals.values().stream()
                .sorted((a, b) -> b.total().compareTo(a.total()))
                .map(row -> new CostBreakdownRow(row.ar(), row.en(), row.total()))
                .toList();
    }

    private boolean inRange(LocalDate date, LocalDate from, LocalDate to) {
        return (from == null || !date.isBefore(from)) && (to == null || !date.isAfter(to));
    }

    private record NamedTotal(String ar, String en, BigDecimal total) {}
}
