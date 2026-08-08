package sa.sijill.api.web.dto;

// Aggregate counts backing the per-module summary cards on the dashboard.
// Not permission-filtered server-side (these are just counts, not records) --
// the frontend only renders the blocks the viewer has nav access to.
public record DashboardStatsDto(Warehouse warehouse, Maintenance maintenance, Assets assets) {

    public record Warehouse(long itemCount, long totalQuantity, long lowStockCount, long pendingRequestCount) {}

    public record Maintenance(long openCount, long inProgressCount, long completedCount, long urgentOpenCount) {}

    public record Assets(long roomCount, long assetCount, long pendingRequestCount) {}
}
