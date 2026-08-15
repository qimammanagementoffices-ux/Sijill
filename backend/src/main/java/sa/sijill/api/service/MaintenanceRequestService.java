package sa.sijill.api.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.*;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.RequestWorkflowErrors;
import sa.sijill.api.repository.*;
import sa.sijill.api.web.dto.FinishMaintenanceRequestRequest;
import sa.sijill.api.web.dto.OverturnRequest;
import sa.sijill.api.web.dto.PartUsedRequest;
import sa.sijill.api.web.dto.RequestDecisionRequest;
import sa.sijill.api.web.dto.SubmitMaintenanceRequestRequest;

/**
 * Same two-stage review as NeedRequestService (docs/need-request-workflow.md),
 * with the two differences master spec §6/§7 calls for: an extra START step
 * after final approval, and no upfront request lines -- parts are recorded at
 * finish, decrementing stock the same way as decision-record.md D1.
 *
 * Having no lines, none of the approval-time line editing applies here; the
 * decision body's line list is simply ignored.
 */
@Service
public class MaintenanceRequestService {

    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final DepartmentRepository departmentRepository;
    private final FaultTypeRepository faultTypeRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final SuggestedStartDateCalculator suggestedStartDateCalculator;
    private final AuditService auditService;
    private final ReviewPolicyService reviewPolicyService;
    private final DepartmentScopeService departmentScopeService;

    public MaintenanceRequestService(
            MaintenanceRequestRepository maintenanceRequestRepository,
            DepartmentRepository departmentRepository,
            FaultTypeRepository faultTypeRepository,
            InventoryItemRepository inventoryItemRepository,
            SuggestedStartDateCalculator suggestedStartDateCalculator,
            AuditService auditService,
            ReviewPolicyService reviewPolicyService,
            DepartmentScopeService departmentScopeService) {
        this.maintenanceRequestRepository = maintenanceRequestRepository;
        this.departmentRepository = departmentRepository;
        this.faultTypeRepository = faultTypeRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.suggestedStartDateCalculator = suggestedStartDateCalculator;
        this.auditService = auditService;
        this.reviewPolicyService = reviewPolicyService;
        this.departmentScopeService = departmentScopeService;
    }

    @Transactional
    public Page<MaintenanceRequest> search(
            MaintenanceRequestStatus status,
            UUID restrictToRequesterId,
            String q,
            boolean archived,
            boolean underReview,
            Employee actor,
            Pageable pageable) {
        java.util.Set<UUID> scope = departmentScopeService.scopeFor(actor);
        Page<MaintenanceRequest> page = maintenanceRequestRepository.search(
                status,
                restrictToRequesterId,
                q,
                archived,
                underReview,
                LocalDate.now(),
                // "in ()" is not valid SQL, so an empty scope passes an id
                // that matches nothing.
                scope == null || scope.isEmpty() ? java.util.Set.of(UUID.randomUUID()) : scope,
                scope == null,
                actor.getId(),
                pageable);
        page.getContent().forEach(this::materialiseResurface);
        return page;
    }

    /** Refuses a decision on a request outside the official's own branch. */
    private void requireWithinScope(MaintenanceRequest request, Employee actor) {
        if (!departmentScopeService.covers(actor, request.getDepartment())) {
            throw RequestWorkflowErrors.outsideDepartment();
        }
    }

    /** See NeedRequestService.materialiseResurface for why this is a write during a read. */
    private void materialiseResurface(MaintenanceRequest request) {
        if (request.getStatus() != MaintenanceRequestStatus.POSTPONED) return;
        if (request.getPostponedUntil() == null || request.getPostponedUntil().isAfter(LocalDate.now())) return;

        request.setStatus(MaintenanceRequestStatus.PENDING);
        addAction(request, null, "RESURFACE", null);
        maintenanceRequestRepository.save(request);
    }

    public MaintenanceRequest get(UUID id) {
        return maintenanceRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Request not found"));
    }

    /** A postponed request whose date has arrived counts as pending everywhere. */
    public static MaintenanceRequestStatus effectiveStatus(MaintenanceRequest request) {
        if (request.getStatus() == MaintenanceRequestStatus.POSTPONED
                && request.getPostponedUntil() != null
                && !request.getPostponedUntil().isAfter(LocalDate.now())) {
            return MaintenanceRequestStatus.PENDING;
        }
        return request.getStatus();
    }

    @Transactional
    public MaintenanceRequest submit(SubmitMaintenanceRequestRequest request, Employee requester) {
        if (request.priority() == null) {
            throw ApiException.validation("Priority is required", Map.of("priority", "must not be blank"));
        }

        MaintenanceRequest maintenanceRequest = new MaintenanceRequest();
        maintenanceRequest.setRequestNumber(maintenanceRequestRepository.nextRequestNumber());
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

    // --- First-level decisions -------------------------------------------

    @Transactional
    public MaintenanceRequest approve(UUID id, RequestDecisionRequest decision, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(request, MaintenanceRequestStatus.PENDING);
        requireWithinScope(request, actor);
        requireNotRepeatingOverturnedDecision(request, actor, "APPROVE");

        addAction(request, actor, "APPROVE", comment(decision));
        // One level or two, per the school's setting for this system.
        request.setStatus(
                reviewPolicyService.maintenanceTwoLevel()
                        ? MaintenanceRequestStatus.APPROVED_UNDER_REVIEW
                        : MaintenanceRequestStatus.APPROVED);
        request.setPostponedUntil(null);
        request.setReturnedBySenior(false);
        return save(request, actor, "MAINTENANCE_REQUEST_APPROVED");
    }

    @Transactional
    public MaintenanceRequest reject(UUID id, RequestDecisionRequest decision, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(request, MaintenanceRequestStatus.PENDING);
        requireWithinScope(request, actor);
        requireNotRepeatingOverturnedDecision(request, actor, "REJECT");
        requireReason(decision);

        addAction(request, actor, "REJECT", comment(decision));
        request.setStatus(
                reviewPolicyService.maintenanceTwoLevel()
                        ? MaintenanceRequestStatus.REJECTED_UNDER_REVIEW
                        : MaintenanceRequestStatus.REJECTED);
        request.setPostponedUntil(null);
        request.setReturnedBySenior(false);
        return save(request, actor, "MAINTENANCE_REQUEST_REJECTED");
    }

    @Transactional
    public MaintenanceRequest postpone(UUID id, RequestDecisionRequest decision, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(request, MaintenanceRequestStatus.PENDING);
        requireWithinScope(request, actor);
        requireReason(decision);
        applyPostponement(request, actor, "POSTPONE", decision);
        return save(request, actor, "MAINTENANCE_REQUEST_POSTPONED");
    }

    // --- Second-level review ---------------------------------------------

    @Transactional
    public MaintenanceRequest countersign(UUID id, RequestDecisionRequest decision, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(
                request,
                MaintenanceRequestStatus.APPROVED_UNDER_REVIEW,
                MaintenanceRequestStatus.REJECTED_UNDER_REVIEW);
        requireWithinScope(request, actor);
        requireDistinctFromFirstLevel(request, actor);

        boolean approving = request.getStatus() == MaintenanceRequestStatus.APPROVED_UNDER_REVIEW;
        addAction(request, actor, approving ? "COUNTERSIGN_APPROVE" : "COUNTERSIGN_REJECT", comment(decision));
        request.setStatus(approving ? MaintenanceRequestStatus.APPROVED : MaintenanceRequestStatus.REJECTED);
        return save(request, actor, approving ? "MAINTENANCE_REQUEST_COUNTERSIGNED" : "MAINTENANCE_REQUEST_REJECTION_CONFIRMED");
    }

    @Transactional
    public MaintenanceRequest overturn(UUID id, OverturnRequest overturn, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(
                request,
                MaintenanceRequestStatus.APPROVED_UNDER_REVIEW,
                MaintenanceRequestStatus.REJECTED_UNDER_REVIEW);
        requireWithinScope(request, actor);
        requireDistinctFromFirstLevel(request, actor);

        boolean wasApproval = request.getStatus() == MaintenanceRequestStatus.APPROVED_UNDER_REVIEW;
        OverturnRequest.Outcome outcome = overturn == null ? null : overturn.outcome();
        if (outcome == null) {
            throw RequestWorkflowErrors.outcomeRequired();
        }
        if (wasApproval && outcome == OverturnRequest.Outcome.APPROVE) {
            throw RequestWorkflowErrors.alreadyApproved();
        }
        if (!wasApproval && outcome == OverturnRequest.Outcome.REJECT) {
            throw RequestWorkflowErrors.alreadyRejected();
        }

        RequestDecisionRequest decision = overturn.asDecision();
        switch (outcome) {
            case POSTPONE -> {
                requireReason(decision);
                applyPostponement(request, actor, "OVERTURN_POSTPONE", decision);
                request.setReturnedBySenior(true);
            }
            case APPROVE -> {
                addAction(request, actor, "OVERTURN_APPROVE", comment(decision));
                request.setStatus(MaintenanceRequestStatus.APPROVED);
                request.setPostponedUntil(null);
            }
            case REJECT -> {
                requireReason(decision);
                addAction(request, actor, "OVERTURN_REJECT", comment(decision));
                request.setStatus(MaintenanceRequestStatus.REJECTED);
                request.setPostponedUntil(null);
            }
        }
        return save(request, actor, "MAINTENANCE_REQUEST_OVERTURNED");
    }

    // --- Work and receipt -------------------------------------------------

    @Transactional
    public MaintenanceRequest start(UUID id, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(request, MaintenanceRequestStatus.APPROVED);
        request.setStatus(MaintenanceRequestStatus.IN_PROGRESS);
        addAction(request, actor, "START", null);
        return save(request, actor, "MAINTENANCE_REQUEST_STARTED");
    }

    @Transactional
    public MaintenanceRequest finish(UUID id, FinishMaintenanceRequestRequest request, Employee actor) {
        MaintenanceRequest maintenanceRequest = openRequest(id);
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
                    throw RequestWorkflowErrors.insufficientStock(item.getCode());
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

        maintenanceRequest.setStatus(MaintenanceRequestStatus.DONE);
        addAction(maintenanceRequest, actor, "FINISH", request == null ? null : request.notes());
        return save(maintenanceRequest, actor, "MAINTENANCE_REQUEST_FINISHED");
    }

    @Transactional
    public MaintenanceRequest receive(UUID id, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(request, MaintenanceRequestStatus.DONE);
        requireRequester(request, actor);

        request.setStatus(MaintenanceRequestStatus.CLOSED);
        addAction(request, actor, "RECEIVE", null);
        return save(request, actor, "MAINTENANCE_REQUEST_RECEIVED");
    }

    /**
     * The work does not match what was asked for. The request goes back to
     * IN_PROGRESS and every part booked against it returns to stock, so the
     * finish form starts clean rather than double-counting.
     */
    @Transactional
    public MaintenanceRequest rejectReceipt(UUID id, RequestDecisionRequest decision, Employee actor) {
        MaintenanceRequest request = openRequest(id);
        requireStatus(request, MaintenanceRequestStatus.DONE);
        requireRequester(request, actor);
        requireReason(decision);

        for (MaintenanceRequestPartUsed partUsed : request.getPartsUsed()) {
            InventoryItem item = partUsed.getInventoryItem();
            item.setQuantity(item.getQuantity() + partUsed.getQuantity());
            inventoryItemRepository.save(item);
        }
        request.getPartsUsed().clear();

        request.setStatus(MaintenanceRequestStatus.IN_PROGRESS);
        addAction(request, actor, "REJECT_RECEIPT", comment(decision));
        return save(request, actor, "MAINTENANCE_REQUEST_RECEIPT_REJECTED");
    }

    // --- Archive ---------------------------------------------------------

    @Transactional
    public MaintenanceRequest archive(UUID id, Employee actor) {
        MaintenanceRequest request = get(id);
        if (request.getArchivedAt() != null) {
            throw RequestWorkflowErrors.alreadyArchived();
        }
        requireStatus(request, MaintenanceRequestStatus.CLOSED);
        request.setArchivedAt(Instant.now());
        request.setArchivedBy(actor);
        addAction(request, actor, "ARCHIVE", null);
        return save(request, actor, "MAINTENANCE_REQUEST_ARCHIVED");
    }

    @Transactional
    public MaintenanceRequest restore(UUID id, Employee actor) {
        MaintenanceRequest request = get(id);
        if (request.getArchivedAt() == null) {
            throw RequestWorkflowErrors.notArchived();
        }
        request.setArchivedAt(null);
        request.setArchivedBy(null);
        addAction(request, actor, "RESTORE", null);
        return save(request, actor, "MAINTENANCE_REQUEST_RESTORED");
    }

    // --- Internals -------------------------------------------------------

    private MaintenanceRequest openRequest(UUID id) {
        MaintenanceRequest request = get(id);
        if (request.getArchivedAt() != null) {
            throw RequestWorkflowErrors.archived();
        }
        return request;
    }

    private MaintenanceRequest save(MaintenanceRequest request, Employee actor, String auditAction) {
        MaintenanceRequest saved = maintenanceRequestRepository.save(request);
        auditService.record(actor, auditAction, "MaintenanceRequest", saved.getId());
        return saved;
    }

    private void applyPostponement(
            MaintenanceRequest request, Employee actor, String action, RequestDecisionRequest decision) {
        LocalDate until = decision == null ? null : decision.postponedUntil();
        if (until == null) {
            throw RequestWorkflowErrors.postponeDateRequired();
        }
        if (!until.isAfter(LocalDate.now())) {
            throw ApiException.validation(
                    "The postponement date must be in the future", Map.of("postponedUntil", "must be after today"));
        }
        request.setStatus(MaintenanceRequestStatus.POSTPONED);
        request.setPostponedUntil(until);
        addAction(request, actor, action, comment(decision));
    }

    private void requireStatus(MaintenanceRequest request, MaintenanceRequestStatus... allowed) {
        MaintenanceRequestStatus current = effectiveStatus(request);
        for (MaintenanceRequestStatus status : allowed) {
            if (current == status) return;
        }
        throw RequestWorkflowErrors.wrongStatus(current.name());
    }

    private void requireRequester(MaintenanceRequest request, Employee actor) {
        if (!request.getRequester().getId().equals(actor.getId())) {
            throw ApiException.forbidden("Only the requester can confirm or reject the completed work");
        }
    }

    private void requireDistinctFromFirstLevel(MaintenanceRequest request, Employee actor) {
        if (request.getRequester().getId().equals(actor.getId())) {
            throw RequestWorkflowErrors.selfReview();
        }
        request.getActions().stream()
                .filter(entry -> "APPROVE".equals(entry.getAction()) || "REJECT".equals(entry.getAction()))
                .reduce((first, second) -> second)
                .filter(entry -> entry.getActor() != null && entry.getActor().getId().equals(actor.getId()))
                .ifPresent(entry -> {
                    throw RequestWorkflowErrors.sameOfficial();
                });
    }

    private void requireNotRepeatingOverturnedDecision(MaintenanceRequest request, Employee actor, String action) {
        if (!request.isReturnedBySenior()) return;
        request.getActions().stream()
                .filter(entry -> action.equals(entry.getAction()))
                .reduce((first, second) -> second)
                .filter(entry -> entry.getActor() != null && entry.getActor().getId().equals(actor.getId()))
                .ifPresent(entry -> {
                    throw RequestWorkflowErrors.decisionOverturned();
                });
    }

    private void requireReason(RequestDecisionRequest decision) {
        if (decision == null || decision.comment() == null || decision.comment().isBlank()) {
            throw RequestWorkflowErrors.reasonRequired();
        }
    }

    private String comment(RequestDecisionRequest decision) {
        if (decision == null || decision.comment() == null || decision.comment().isBlank()) return null;
        return decision.comment().trim();
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
