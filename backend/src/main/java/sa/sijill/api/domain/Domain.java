package sa.sijill.api.domain;

/**
 * Shared by Category and InventoryItem — the reusable inventory module is
 * parameterized by domain rather than duplicated per master spec §7. Only
 * WAREHOUSE is wired up through Phase 3a; MAINTENANCE is reserved for a
 * later phase reusing the same tables/entities untouched.
 */
public enum Domain {
    WAREHOUSE,
    MAINTENANCE,
    ASSET,
    ROOM
}
