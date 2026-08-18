package sa.sijill.api.web;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.domain.NeedRequestStatus;
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
    @PreAuthorize("hasAnyAuthority('wh.view', 'wh.items', 'wh.qty')")
    public PagedResponse<InventoryItemListItem> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean lowStockOnly,
            @RequestParam(required = false, defaultValue = "false") boolean requestedOnly,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @PageableDefault(size = 20, sort = "nameEn") Pageable pageable) {
        Page<InventoryItem> page =
                inventoryItemService.search(
                        Domain.WAREHOUSE, q, lowStockOnly, requestedOnly, categoryId, dateFrom, dateTo, pageable);
        Map<UUID, String> images = ItemImages.firstImageByItem(attachmentRepository, page.getContent());
        List<UUID> itemIds = page.getContent().stream().map(InventoryItem::getId).toList();
        Map<UUID, Long> requestedQuantities = itemIds.isEmpty()
                ? Map.of()
                : itemHistoryRepository
                        .sumActiveRequestedQuantities(
                                itemIds,
                                EnumSet.of(
                                        NeedRequestStatus.PENDING,
                                        NeedRequestStatus.POSTPONED,
                                        NeedRequestStatus.APPROVED_UNDER_REVIEW,
                                        NeedRequestStatus.APPROVED))
                        .stream()
                        .collect(Collectors.toMap(
                                ItemHistoryRepository.RequestedQuantityTotal::getItemId,
                                ItemHistoryRepository.RequestedQuantityTotal::getQuantityRequested));
        return PagedResponse.from(
                page,
                item -> InventoryItemListItem.from(
                        item, images.get(item.getId()), requestedQuantities.getOrDefault(item.getId(), 0L)));
    }

    @GetMapping("/request-options")
    @PreAuthorize("hasAuthority('wh.request')")
    public PagedResponse<InventoryRequestOption> requestOptions(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId,
            @PageableDefault(size = 20, sort = "nameEn") Pageable pageable) {
        Page<InventoryItem> page = inventoryItemService.search(
                Domain.WAREHOUSE, q, false, false, categoryId, null, null, pageable);
        Map<UUID, String> images = ItemImages.firstImageByItem(attachmentRepository, page.getContent());
        return PagedResponse.from(page, item -> InventoryRequestOption.from(item, images.get(item.getId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('wh.view', 'wh.items', 'wh.qty')")
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
