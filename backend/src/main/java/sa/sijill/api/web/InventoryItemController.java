package sa.sijill.api.web;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.repository.ItemHistoryRepository;
import sa.sijill.api.service.InventoryItemService;
import sa.sijill.api.web.dto.*;

@RestController
@RequestMapping("/api/v1/warehouse/items")
public class InventoryItemController {

    private final InventoryItemService inventoryItemService;
    private final ItemHistoryRepository itemHistoryRepository;
    private final AttachmentRepository attachmentRepository;

    public InventoryItemController(
            InventoryItemService inventoryItemService,
            ItemHistoryRepository itemHistoryRepository,
            AttachmentRepository attachmentRepository) {
        this.inventoryItemService = inventoryItemService;
        this.itemHistoryRepository = itemHistoryRepository;
        this.attachmentRepository = attachmentRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('wh.view')")
    public PagedResponse<InventoryItemListItem> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean lowStockOnly,
            @PageableDefault(size = 20, sort = "nameEn") Pageable pageable) {
        Page<InventoryItem> page = inventoryItemService.search(Domain.WAREHOUSE, q, lowStockOnly, pageable);
        Map<UUID, String> images = firstImageByItem(page.getContent());
        return PagedResponse.from(page, item -> InventoryItemListItem.from(item, images.get(item.getId())));
    }

    // One query for the whole page rather than a lookup per row. Only
    // images: a PDF spec sheet is an attachment too, and it has no thumbnail.
    private Map<UUID, String> firstImageByItem(List<InventoryItem> items) {
        if (items.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = items.stream().map(InventoryItem::getId).toList();
        return attachmentRepository.findByOwnerTypeAndOwnerIdIn(AttachmentOwnerType.INVENTORY_ITEM, ids).stream()
                .filter(a -> a.getContentType() != null && a.getContentType().startsWith("image/"))
                .sorted(Comparator.comparing(Attachment::getCreatedAt))
                .collect(Collectors.toMap(Attachment::getOwnerId, Attachment::getUrl, (first, later) -> first));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('wh.view')")
    public InventoryItemDetail get(@PathVariable UUID id) {
        return InventoryItemDetail.from(inventoryItemService.get(id));
    }

    // The item card's two history sections. Separate endpoints rather than
    // fields on the detail DTO: the list screen fetches details too, and it
    // has no use for either history.
    @GetMapping("/{id}/purchases")
    @PreAuthorize("hasAuthority('wh.view')")
    public List<ItemPurchaseLineDto> purchases(@PathVariable UUID id) {
        return itemHistoryRepository.findPurchasesByItem(id).stream()
                .map(ItemPurchaseLineDto::from)
                .toList();
    }

    @GetMapping("/{id}/requests")
    @PreAuthorize("hasAuthority('wh.view')")
    public List<ItemRequestLineDto> requests(@PathVariable UUID id) {
        return itemHistoryRepository.findRequestsByItem(id).stream()
                .map(ItemRequestLineDto::from)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.items')")
    public InventoryItemDetail create(
            @RequestBody CreateInventoryItemRequest request, @AuthenticationPrincipal Employee actor) {
        return InventoryItemDetail.from(inventoryItemService.create(Domain.WAREHOUSE, request, actor));
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
