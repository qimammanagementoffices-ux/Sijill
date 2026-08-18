package sa.sijill.api.web.dto;

// Aggregate counts backing the per-module summary cards on the dashboard.
// Each module is null unless the caller can view that module. Filtering is
// server-side so aggregate counts cannot leak through a direct API request.
public record DashboardStatsDto(Warehouse warehouse, Maintenance maintenance, Assets assets) {

    public record Warehouse(long itemCount, long totalQuantity, long lowStockCount, Long pendingRequestCount) {}

    public record Maintenance(long openCount, long inProgressCount, long completedCount, long urgentOpenCount) {}

    public record Assets(long roomCount, long assetCount, Long pendingRequestCount) {}
}
