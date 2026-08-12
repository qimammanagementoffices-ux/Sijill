package sa.sijill.api.service;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.*;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.*;
import sa.sijill.api.web.dto.FinishMaintenanceRequestRequest;
import sa.sijill.api.web.dto.PartUsedRequest;
import sa.sijill.api.web.dto.SubmitMaintenanceRequestRequest;

/**
 * Differs from NeedRequestService in two ways per master spec §6/§7:
 * requires an extra START step (APPROVED -> IN_PROGRESS) before finish, and
 * has no upfront request lines -- parts are only recorded at finish
 * ("parts-used flow"), decrementing stock the same way as
 * decision-record.md D1's finish-time decrement.
 */
@Service
public class MaintenanceRequestService {

    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final DepartmentRepository departmentRepository;
    private final FaultTypeRepository faultTypeRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final SuggestedStartDateCalculator suggestedStartDateCalculator;
    private final AuditService auditService;

    public MaintenanceRequestService(
            MaintenanceRequestRepository maintenanceRequestRepository,
            DepartmentRepository departmentRepository,
            FaultTypeRepository faultTypeRepository,
            InventoryItemRepository inventoryItemRepository,
            SuggestedStartDateCalculator suggestedStartDateCalculator,
            AuditService auditService) {
        this.maintenanceRequestRepository = maintenanceRequestRepository;
        this.departmentRepository = departmentRepository;
        this.faultTypeRepository = faultTypeRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.suggestedStartDateCalculator = suggestedStartDateCalculator;
        this.auditService = auditService;
    }

    public Page<MaintenanceRequest> search(MaintenanceRequestStatus status, UUID restrictToRequesterId, Pageable pageable) {
        return maintenanceRequestRepository.search(status, restrictToRequesterId, pageable);
    }

    public MaintenanceRequest get(UUID id) {
        return maintenanceRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Request not found"));
    }

    @Transactional
    public MaintenanceRequest submit(SubmitMaintenanceRequestRequest request, Employee requester) {
        if (request.priority() == null) {
            throw ApiException.validation("Priority is required", Map.of("priority", "must not be blank"));
        }

        MaintenanceRequest maintenanceRequest = new MaintenanceRequest();
        maintenanceRequest.setRequester(requester);
        maintenanceRequest.setDepartment(resolveRequesterDepartment(request.departmentId(), requester));
        maintenanceRequest.setFaultType(resolveFaultType(request.faultTypeId()));
        maintenanceRequest.setLocation(request.location());
        maintenanceRequest.setPriority(request.priority());
        maintenanceRequest.setDescription(request.description());
        maintenanceRequest.setStatus(MaintenanceRequestStatus.PENDING);
        maintenanceRequest.setSuggestedStartDate(suggestedStartDateCalculator.from(LocalDate.now()));

        addAction(maintenanceRequest, requester, "SUBMIT", null);
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);
        auditService.record(requester, "MAINTENANCE_REQUEST_SUBMITTED", "MaintenanceRequest", saved.getId());
        return saved;
    }

    @Transactional
    public MaintenanceRequest approve(UUID id, Employee actor) {
        MaintenanceRequest request = get(id);
        requireStatus(request, MaintenanceRequestStatus.PENDING, MaintenanceRequestStatus.POSTPONED);
        request.setStatus(MaintenanceRequestStatus.APPROVED);
        addAction(request, actor, "APPROVE", null);
        MaintenanceRequest saved = maintenanceRequestRepository.save(request);
        auditService.record(actor, "MAINTENANCE_REQUEST_APPROVED", "MaintenanceRequest", saved.getId());
        return saved;
    }

    @Transactional
    public MaintenanceRequest reject(UUID id, String reason, Employee actor) {
        MaintenanceRequest request = get(id);
        requireStatus(
                request,
                MaintenanceRequestStatus.PENDING,
                MaintenanceRequestStatus.APPROVED,
                MaintenanceRequestStatus.POSTPONED);
        request.setStatus(MaintenanceRequestStatus.REJECTED);
        addAction(request, actor, "REJECT", reason);
        MaintenanceRequest saved = maintenanceRequestRepository.save(request);
        auditService.record(actor, "MAINTENANCE_REQUEST_REJECTED", "MaintenanceRequest", saved.getId());
        return saved;
    }

    @Transactional
    public MaintenanceRequest postpone(UUID id, String reason, Employee actor) {
        MaintenanceRequest request = get(id);
        requireStatus(request, MaintenanceRequestStatus.PENDING, MaintenanceRequestStatus.APPROVED);
        request.setStatus(MaintenanceRequestStatus.POSTPONED);
        addAction(request, actor, "POSTPONE", reason);
        MaintenanceRequest saved = maintenanceRequestRepository.save(request);
        auditService.record(actor, "MAINTENANCE_REQUEST_POSTPONED", "MaintenanceRequest", saved.getId());
        return saved;
    }

    @Transactional
    public MaintenanceRequest start(UUID id, Employee actor) {
        MaintenanceRequest request = get(id);
        requireStatus(request, MaintenanceRequestStatus.APPROVED);
        request.setStatus(MaintenanceRequestStatus.IN_PROGRESS);
        addAction(request, actor, "START", null);
        MaintenanceRequest saved = maintenanceRequestRepository.save(request);
        auditService.record(actor, "MAINTENANCE_REQUEST_STARTED", "MaintenanceRequest", saved.getId());
        return saved;
    }

    @Transactional
    public MaintenanceRequest finish(UUID id, FinishMaintenanceRequestRequest request, Employee actor) {
        MaintenanceRequest maintenanceRequest = get(id);
        requireStatus(maintenanceRequest, MaintenanceRequestStatus.IN_PROGRESS);

        if (request != null && request.partsUsed() != null) {
            for (PartUsedRequest partUsedRequest : request.partsUsed()) {
                if (partUsedRequest.quantity() <= 0) {
                    throw ApiException.validation("Part quantity must be positive", Map.of("quantity", "must be > 0"));
                }
                InventoryItem item = inventoryItemRepository
                        .findById(partUsedRequest.inventoryItemId())
                        .orElseThrow(() -> ApiException.validation(
                                "Part not found", Map.of("inventoryItemId", "does not exist")));
                if (item.getDomain() != Domain.MAINTENANCE) {
                    throw ApiException.validation(
                            "Item is not a maintenance part", Map.of("inventoryItemId", "wrong domain"));
                }
                if (item.getQuantity() < partUsedRequest.quantity()) {
                    throw ApiException.validation(
                            "Insufficient stock for part " + item.getCode(), Map.of("quantity", "exceeds on-hand quantity"));
                }
                item.setQuantity(item.getQuantity() - partUsedRequest.quantity());
                inventoryItemRepository.save(item);

                MaintenanceRequestPartUsed partUsed = new MaintenanceRequestPartUsed();
                partUsed.setMaintenanceRequest(maintenanceRequest);
                partUsed.setInventoryItem(item);
                partUsed.setQuantity(partUsedRequest.quantity());
                maintenanceRequest.getPartsUsed().add(partUsed);
            }
        }

        maintenanceRequest.setStatus(MaintenanceRequestStatus.CLOSED);
        addAction(maintenanceRequest, actor, "FINISH", null);
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);
        auditService.record(actor, "MAINTENANCE_REQUEST_FINISHED", "MaintenanceRequest", saved.getId());
        return saved;
    }

    private void requireStatus(MaintenanceRequest request, MaintenanceRequestStatus... allowed) {
        for (MaintenanceRequestStatus status : allowed) {
            if (request.getStatus() == status) return;
        }
        throw ApiException.conflict(
                "Request is not in a state that allows this action (current: " + request.getStatus() + ")");
    }

    private void addAction(MaintenanceRequest request, Employee actor, String action, String reason) {
        MaintenanceRequestAction entry = new MaintenanceRequestAction();
        entry.setMaintenanceRequest(request);
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

    private Department resolveRequesterDepartment(UUID id, Employee requester) {
        Department department = resolveDepartment(id);
        if (department != null && requester.getDepartments().stream().noneMatch(assigned -> assigned.getId().equals(id))) {
            throw ApiException.forbidden("Department is not assigned to this employee");
        }
        return department;
    }

    private FaultType resolveFaultType(UUID id) {
        if (id == null) return null;
        return faultTypeRepository.findById(id).orElseThrow(() -> ApiException.validation(
                "Fault type not found", Map.of("faultTypeId", "does not exist")));
    }
}
