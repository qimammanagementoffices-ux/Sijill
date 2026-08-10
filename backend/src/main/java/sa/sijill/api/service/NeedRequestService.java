package sa.sijill.api.service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.*;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.*;
import sa.sijill.api.web.dto.CreateNeedRequestRequest;
import sa.sijill.api.web.dto.FinishNeedRequestRequest;
import sa.sijill.api.web.dto.NeedRequestLineRequest;

/**
 * Per decision-record.md D1: stock decrements on finish (not approve),
 * partial fulfillment allowed. Per D3: finish moves the request straight
 * to CLOSED — no separate DONE/requester-confirmation step.
 *
 * Action endpoints check current status server-side and reject with a
 * plain 409 CONFLICT (not StaleVersionException — no embedded "current",
 * per docs/api-conventions.md's "action endpoints are not version-based").
 */
@Service
public class NeedRequestService {

    private final NeedRequestRepository needRequestRepository;
    private final DepartmentRepository departmentRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final RoomRepository roomRepository;
    private final SuggestedStartDateCalculator suggestedStartDateCalculator;
    private final AuditService auditService;

    public NeedRequestService(
            NeedRequestRepository needRequestRepository,
            DepartmentRepository departmentRepository,
            CategoryRepository categoryRepository,
            InventoryItemRepository inventoryItemRepository,
            RoomRepository roomRepository,
            SuggestedStartDateCalculator suggestedStartDateCalculator,
            AuditService auditService) {
        this.needRequestRepository = needRequestRepository;
        this.departmentRepository = departmentRepository;
        this.categoryRepository = categoryRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.roomRepository = roomRepository;
        this.suggestedStartDateCalculator = suggestedStartDateCalculator;
        this.auditService = auditService;
    }

    public Page<NeedRequest> search(NeedRequestStatus status, UUID restrictToRequesterId, Pageable pageable) {
        return needRequestRepository.search(status, restrictToRequesterId, pageable);
    }

    public NeedRequest get(UUID id) {
        return needRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Request not found"));
    }

    @Transactional
    public NeedRequest submit(CreateNeedRequestRequest request, Employee requester) {
        // A "custom request" (something not in the catalogue) has no lines --
        // it is described entirely in notes. Either shape is valid, an empty
        // one is not.
        boolean hasLines = request.lines() != null && !request.lines().isEmpty();
        boolean hasNotes = request.notes() != null && !request.notes().isBlank();
        if (!hasLines && !hasNotes) {
            throw ApiException.validation(
                    "A request needs at least one line, or notes describing it",
                    Map.of("lines", "must not be empty unless notes are provided"));
        }

        NeedRequest needRequest = new NeedRequest();
        needRequest.setRequester(requester);
        needRequest.setDepartment(resolveDepartment(request.departmentId()));
        needRequest.setCategory(resolveCategory(request.categoryId()));
        needRequest.setRoom(resolveRoom(request.roomId()));
        needRequest.setNotes(request.notes());
        needRequest.setStatus(NeedRequestStatus.PENDING);
        needRequest.setSuggestedStartDate(suggestedStartDateCalculator.from(LocalDate.now()));

        for (NeedRequestLineRequest lineRequest : hasLines ? request.lines() : List.<NeedRequestLineRequest>of()) {
            if (lineRequest.quantityRequested() <= 0) {
                throw ApiException.validation(
                        "Line quantity must be positive", Map.of("quantityRequested", "must be > 0"));
            }
            InventoryItem item = inventoryItemRepository
                    .findById(lineRequest.inventoryItemId())
                    .orElseThrow(() -> ApiException.validation(
                            "Inventory item not found", Map.of("inventoryItemId", "does not exist")));
            NeedRequestLine line = new NeedRequestLine();
            line.setNeedRequest(needRequest);
            line.setInventoryItem(item);
            line.setQuantityRequested(lineRequest.quantityRequested());
            needRequest.getLines().add(line);
        }

        addAction(needRequest, requester, "SUBMIT", null);
        NeedRequest saved = needRequestRepository.save(needRequest);
        auditService.record(requester, "NEED_REQUEST_SUBMITTED", "NeedRequest", saved.getId());
        return saved;
    }

    @Transactional
    public NeedRequest approve(UUID id, Employee actor) {
        NeedRequest request = get(id);
        requireStatus(request, NeedRequestStatus.PENDING, NeedRequestStatus.POSTPONED);
        request.setStatus(NeedRequestStatus.APPROVED);
        addAction(request, actor, "APPROVE", null);
        NeedRequest saved = needRequestRepository.save(request);
        auditService.record(actor, "NEED_REQUEST_APPROVED", "NeedRequest", saved.getId());
        return saved;
    }

    @Transactional
    public NeedRequest reject(UUID id, String reason, Employee actor) {
        NeedRequest request = get(id);
        requireStatus(request, NeedRequestStatus.PENDING, NeedRequestStatus.APPROVED, NeedRequestStatus.POSTPONED);
        request.setStatus(NeedRequestStatus.REJECTED);
        addAction(request, actor, "REJECT", reason);
        NeedRequest saved = needRequestRepository.save(request);
        auditService.record(actor, "NEED_REQUEST_REJECTED", "NeedRequest", saved.getId());
        return saved;
    }

    @Transactional
    public NeedRequest postpone(UUID id, String reason, Employee actor) {
        NeedRequest request = get(id);
        requireStatus(request, NeedRequestStatus.PENDING, NeedRequestStatus.APPROVED);
        request.setStatus(NeedRequestStatus.POSTPONED);
        addAction(request, actor, "POSTPONE", reason);
        NeedRequest saved = needRequestRepository.save(request);
        auditService.record(actor, "NEED_REQUEST_POSTPONED", "NeedRequest", saved.getId());
        return saved;
    }

    @Transactional
    public NeedRequest finish(UUID id, FinishNeedRequestRequest request, Employee actor) {
        NeedRequest needRequest = get(id);
        requireStatus(needRequest, NeedRequestStatus.APPROVED);

        Map<UUID, Integer> issuedByLineId = new HashMap<>();
        if (request != null && request.lines() != null) {
            for (var finishLine : request.lines()) {
                issuedByLineId.put(finishLine.lineId(), finishLine.quantityIssued());
            }
        }

        for (NeedRequestLine line : needRequest.getLines()) {
            Integer requestedIssue = issuedByLineId.get(line.getId());
            int quantityIssued = requestedIssue != null ? requestedIssue : line.getQuantityRequested();

            if (quantityIssued < 0 || quantityIssued > line.getQuantityRequested()) {
                throw ApiException.validation(
                        "Issued quantity must be between 0 and the requested quantity",
                        Map.of("quantityIssued", "out of range"));
            }

            InventoryItem item = line.getInventoryItem();
            if (item.getQuantity() < quantityIssued) {
                throw ApiException.validation(
                        "Insufficient stock for item " + item.getCode(), Map.of("quantityIssued", "exceeds on-hand quantity"));
            }
            item.setQuantity(item.getQuantity() - quantityIssued);
            inventoryItemRepository.save(item);

            line.setQuantityIssued(quantityIssued);
        }

        needRequest.setStatus(NeedRequestStatus.CLOSED);
        addAction(needRequest, actor, "FINISH", null);
        NeedRequest saved = needRequestRepository.save(needRequest);
        auditService.record(actor, "NEED_REQUEST_FINISHED", "NeedRequest", saved.getId());
        return saved;
    }

    private void requireStatus(NeedRequest request, NeedRequestStatus... allowed) {
        for (NeedRequestStatus status : allowed) {
            if (request.getStatus() == status) return;
        }
        throw ApiException.conflict("Request is not in a state that allows this action (current: " + request.getStatus() + ")");
    }

    private void addAction(NeedRequest request, Employee actor, String action, String reason) {
        NeedRequestAction entry = new NeedRequestAction();
        entry.setNeedRequest(request);
        entry.setActor(actor);
        entry.setAction(action);
        entry.setReason(reason);
        request.getActions().add(entry);
    }

    private Department resolveDepartment(UUID id) {
        if (id == null) return null;
        return departmentRepository.findById(id).orElseThrow(() -> ApiException.validation(
                "Department not found", Map.of("departmentId", "does not exist")));
    }

    private Category resolveCategory(UUID id) {
        if (id == null) return null;
        return categoryRepository.findById(id).orElseThrow(() -> ApiException.validation(
                "Category not found", Map.of("categoryId", "does not exist")));
    }

    private Room resolveRoom(UUID id) {
        if (id == null) return null;
        return roomRepository.findById(id).orElseThrow(() -> ApiException.validation(
                "Room not found", Map.of("roomId", "does not exist")));
    }
}
