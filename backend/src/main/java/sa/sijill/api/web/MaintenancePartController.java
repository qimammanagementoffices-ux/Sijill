package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.service.InventoryItemService;
import sa.sijill.api.web.dto.*;

// Thin wrapper activating Domain.MAINTENANCE on the same reusable
// InventoryItemService warehouse items use (master spec §7: "one reusable
// inventory module... not two copied code paths"). Same wh.* permissions
// per the Phase 4 decision record note — the spec's mt.* catalogue has no
// items/qty equivalent.
@RestController
@RequestMapping("/api/v1/maintenance/parts")
public class MaintenancePartController {

    private final InventoryItemService inventoryItemService;

    public MaintenancePartController(InventoryItemService inventoryItemService) {
        this.inventoryItemService = inventoryItemService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('wh.view')")
    public PagedResponse<InventoryItemListItem> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean lowStockOnly,
            @PageableDefault(size = 20, sort = "nameEn") Pageable pageable) {
        Page<InventoryItem> page = inventoryItemService.search(Domain.MAINTENANCE, q, lowStockOnly, pageable);
        return PagedResponse.from(page, InventoryItemListItem::from);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('wh.view')")
    public InventoryItemDetail get(@PathVariable UUID id) {
        return InventoryItemDetail.from(inventoryItemService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.items')")
    public InventoryItemDetail create(
            @RequestBody CreateInventoryItemRequest request, @AuthenticationPrincipal Employee actor) {
        return InventoryItemDetail.from(inventoryItemService.create(Domain.MAINTENANCE, request, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('wh.items')")
    public InventoryItemDetail update(
            @PathVariable UUID id,
            @RequestBody UpdateInventoryItemRequest request,
            @AuthenticationPrincipal Employee actor) {
        return InventoryItemDetail.from(inventoryItemService.update(id, request, actor));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('wh.items')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        inventoryItemService.deactivate(id, actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/adjust-quantity")
    @PreAuthorize("hasAuthority('wh.qty')")
    public InventoryItemDetail adjustQuantity(
            @PathVariable UUID id, @RequestBody AdjustQuantityRequest request, @AuthenticationPrincipal Employee actor) {
        return InventoryItemDetail.from(inventoryItemService.adjustQuantity(id, request, actor));
    }
}
