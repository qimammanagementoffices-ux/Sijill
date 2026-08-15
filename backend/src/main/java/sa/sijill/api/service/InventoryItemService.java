package sa.sijill.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.CategoryRepository;
import sa.sijill.api.repository.InventoryItemRepository;
import sa.sijill.api.web.dto.AdjustQuantityRequest;
import sa.sijill.api.web.dto.CreateInventoryItemRequest;
import sa.sijill.api.web.dto.InventoryItemDetail;
import sa.sijill.api.web.dto.UpdateInventoryItemRequest;

@Service
public class InventoryItemService {

    private final InventoryItemRepository inventoryItemRepository;
    private final CategoryRepository categoryRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public InventoryItemService(
            InventoryItemRepository inventoryItemRepository,
            CategoryRepository categoryRepository,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.categoryRepository = categoryRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public Page<InventoryItem> search(Domain domain, String q, boolean lowStockOnly, Pageable pageable) {
        return search(domain, q, lowStockOnly, false, null, null, null, pageable);
    }

    // Null filter = "no filter", so the query's `:x is null or ...` guards
    // keep a request with nothing selected identical to the old behaviour.
    public Page<InventoryItem> search(
            Domain domain,
            String q,
            boolean lowStockOnly,
            boolean requestedOnly,
            UUID categoryId,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {
        return inventoryItemRepository.search(
                domain,
                q,
                lowStockOnly,
                requestedOnly,
                EnumSet.of(
                        NeedRequestStatus.PENDING,
                        NeedRequestStatus.POSTPONED,
                        NeedRequestStatus.APPROVED_UNDER_REVIEW,
                        NeedRequestStatus.APPROVED),
                categoryId,
                dateFrom,
                dateTo,
                pageable);
    }

    public InventoryItem get(UUID id) {
        return inventoryItemRepository.findById(id).orElseThrow(() -> ApiException.notFound("Item not found"));
    }

    @Transactional
    public InventoryItem create(Domain domain, CreateInventoryItemRequest request, Employee actor) {
        if (request.nameAr() == null || request.nameAr().isBlank() || request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("nameAr", "must not be blank"));
        }

        InventoryItem item = new InventoryItem();
        item.setDomain(domain);
        item.setCode(nextCode(domain));
        item.setNameAr(request.nameAr());
        item.setNameEn(request.nameEn());
        item.setNameHi(request.nameHi());
        item.setCategory(resolveCategory(request.categoryId()));
        item.setUnit(request.unit());
        item.setWeight(request.weight());
        item.setDateAdded(request.dateAdded() != null ? request.dateAdded() : java.time.LocalDate.now());
        item.setMinQuantity(request.minQuantity());
        item.setQuantity(Math.max(request.quantity(), 0));
        item.setActive(true);

        InventoryItem saved = inventoryItemRepository.save(item);
        auditService.record(actor, "INVENTORY_ITEM_CREATED", "InventoryItem", saved.getId());
        return saved;
    }

    @Transactional
    public InventoryItem update(UUID id, UpdateInventoryItemRequest request, Employee actor) {
        InventoryItem item = get(id);
        if (item.getVersion() != request.version()) {
            throw new StaleVersionException(InventoryItemDetail.from(item));
        }
        if (request.nameAr() == null || request.nameAr().isBlank() || request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("nameAr", "must not be blank"));
        }

        item.setNameAr(request.nameAr());
        item.setNameEn(request.nameEn());
        item.setNameHi(request.nameHi());
        item.setCategory(resolveCategory(request.categoryId()));
        item.setUnit(request.unit());
        item.setWeight(request.weight());
        // Null keeps the existing date: the field is optional on the wire, and
        // clearing it would lose when the item entered the warehouse.
        if (request.dateAdded() != null) {
            item.setDateAdded(request.dateAdded());
        }
        item.setMinQuantity(request.minQuantity());

        InventoryItem saved = inventoryItemRepository.save(item);
        auditService.record(actor, "INVENTORY_ITEM_UPDATED", "InventoryItem", saved.getId());
        return saved;
    }

    @Transactional
    public void deactivate(UUID id, Employee actor) {
        InventoryItem item = get(id);
        item.setActive(false);
        inventoryItemRepository.save(item);
        auditService.record(actor, "INVENTORY_ITEM_DEACTIVATED", "InventoryItem", item.getId());
    }

    @Transactional
    public InventoryItem adjustQuantity(UUID id, AdjustQuantityRequest request, Employee actor) {
        if (request.reason() == null || request.reason().isBlank()) {
            throw ApiException.validation("Reason is required", Map.of("reason", "must not be blank"));
        }
        InventoryItem item = get(id);
        int previousQuantity = item.getQuantity();
        int newQuantity = previousQuantity + request.delta();
        if (newQuantity < 0) {
            throw ApiException.validation(
                    "Adjustment would result in negative quantity", Map.of("delta", "too large"));
        }
        item.setQuantity(newQuantity);
        InventoryItem saved = inventoryItemRepository.save(item);
        auditService.record(
                actor,
                "INVENTORY_ITEM_QUANTITY_ADJUSTED",
                "InventoryItem",
                saved.getId(),
                toJson(Map.of("quantity", previousQuantity)),
                toJson(Map.of("quantity", newQuantity, "reason", request.reason())));
        return saved;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private Category resolveCategory(UUID categoryId) {
        if (categoryId == null) return null;
        return categoryRepository.findById(categoryId).orElseThrow(() -> ApiException.validation(
                "Category not found", Map.of("categoryId", "does not exist")));
    }

    // Codes are server-generated, never client-supplied: the old flow let a
    // user type one and only checked existsByDomainAndCode first, which two
    // concurrent creates could both pass. A sequence hands out each number
    // once, so the unique constraint is now a backstop rather than a
    // routine failure mode. See V63__code_sequences.sql.
    // Domain also carries ASSET and ROOM, which are category-only and never
    // reach inventory_item (the table's own check constraint allows just the
    // two below) -- hence the explicit reject rather than a silent prefix.
    private String nextCode(Domain domain) {
        return switch (domain) {
            case WAREHOUSE -> "WH-" + String.format("%04d", inventoryItemRepository.nextWarehouseCodeSequence());
            case MAINTENANCE -> "MN-" + String.format("%04d", inventoryItemRepository.nextMaintenanceCodeSequence());
            case ASSET, ROOM -> throw ApiException.validation(
                    "Inventory items exist only in the warehouse and maintenance domains",
                    Map.of("domain", "must be WAREHOUSE or MAINTENANCE"));
        };
    }
}
