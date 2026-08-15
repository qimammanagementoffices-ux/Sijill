package sa.sijill.api.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.*;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.RequestWorkflowErrors;
import sa.sijill.api.repository.*;
import sa.sijill.api.web.dto.CreateNeedRequestRequest;
import sa.sijill.api.web.dto.FinishNeedRequestRequest;
import sa.sijill.api.web.dto.NeedRequestLineRequest;
import sa.sijill.api.web.dto.OverturnRequest;
import sa.sijill.api.web.dto.RequestDecisionRequest;

/**
 * Two-stage review per docs/need-request-workflow.md. A first-level official
 * approves or rejects; a second, different official counter-signs or overturns.
 * Only a counter-signed APPROVED request can be delivered.
 *
 * Per decision-record.md D1: stock decrements on delivery (not approval),
 * partial fulfillment allowed. D3's collapsed closure is superseded — the
 * requester confirms receipt, and rejecting receipt restores the stock that
 * was deducted.
 *
 * Action endpoints check current status server-side and reject with a plain
 * 409 CONFLICT (not StaleVersionException — see docs/api-conventions.md).
 */
@Service
public class NeedRequestService {

    private static final int EDIT_WINDOW_MINUTES = 60;
    private static final String EDIT_LINES_PERMISSION = "wh.act.edit.lines";
    private static final ZoneId SCHOOL_TIME_ZONE = ZoneId.of("Asia/Riyadh");

    private final NeedRequestRepository needRequestRepository;
    private final DepartmentRepository departmentRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final RoomRepository roomRepository;
    private final SuggestedStartDateCalculator suggestedStartDateCalculator;
    private final AuditService auditService;
    private final ReviewPolicyService reviewPolicyService;
    private final DepartmentScopeService departmentScopeService;

    public NeedRequestService(
            NeedRequestRepository needRequestRepository,
            DepartmentRepository departmentRepository,
            CategoryRepository categoryRepository,
            InventoryItemRepository inventoryItemRepository,
            RoomRepository roomRepository,
            SuggestedStartDateCalculator suggestedStartDateCalculator,
            AuditService auditService,
            ReviewPolicyService reviewPolicyService,
            DepartmentScopeService departmentScopeService) {
        this.needRequestRepository = needRequestRepository;
        this.departmentRepository = departmentRepository;
        this.categoryRepository = categoryRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.roomRepository = roomRepository;
        this.suggestedStartDateCalculator = suggestedStartDateCalculator;
        this.auditService = auditService;
        this.reviewPolicyService = reviewPolicyService;
        this.departmentScopeService = departmentScopeService;
    }

    @Transactional
    public Page<NeedRequest> search(
            NeedRequestStatus status,
            UUID restrictToRequesterId,
            String q,
            boolean archived,
            boolean underReview,
            Employee actor,
            Pageable pageable) {
        Set<UUID> scope = departmentScopeService.scopeFor(actor);
        Page<NeedRequest> page = needRequestRepository.search(
                status,
                restrictToRequesterId,
                q,
                archived,
                underReview,
                LocalDate.now(SCHOOL_TIME_ZONE),
                // "in ()" is not valid SQL, so an empty scope passes a random
                // id that matches nothing rather than an empty list.
                scope == null || scope.isEmpty() ? Set.of(UUID.randomUUID()) : scope,
                scope == null,
                actor.getId(),
                pageable);
        page.getContent().forEach(this::materialiseResurface);
        return page;
    }

    /** Refuses a decision on a request outside the official's own branch. */
    private void requireWithinScope(NeedRequest request, Employee actor) {
        if (!departmentScopeService.covers(actor, request.getDepartment())) {
            throw RequestWorkflowErrors.outsideDepartment();
        }
    }

    public NeedRequest get(UUID id) {
        return needRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Request not found"));
    }

    /**
     * Turns a due postponement into a real status change with a log entry, so
     * the return to the queue is visible in the request's history rather than
     * only implied by {@link #effectiveStatus}. Idempotent: once the status is
     * PENDING there is nothing left to do.
     *
     * A write during a read, deliberately — the alternative is a nightly job
     * that can miss a night, and the entry has to exist before anyone acts on
     * the request or the history is wrong for exactly the period it matters.
     */
    private void materialiseResurface(NeedRequest request) {
        LocalDate today = LocalDate.now(SCHOOL_TIME_ZONE);
        if (request.getStatus() != NeedRequestStatus.POSTPONED) return;
        if (request.getPostponedUntil() == null || request.getPostponedUntil().isAfter(today)) return;

        request.setStatus(NeedRequestStatus.PENDING);
        request.setSuggestedStartDate(suggestedStartDateCalculator.from(today));
        // Null actor = the system acted, not an employee.
        addAction(request, null, "RESURFACE", null);
        needRequestRepository.save(request);
    }

    /**
     * A postponed request whose date has arrived counts as pending everywhere —
     * in the queue query and in every action guard. Resurfacing is a condition,
     * not a scheduled job: no night to miss, no state to repair.
     */
    public static NeedRequestStatus effectiveStatus(NeedRequest request) {
        if (request.getStatus() == NeedRequestStatus.POSTPONED
                && request.getPostponedUntil() != null
                && !request.getPostponedUntil().isAfter(LocalDate.now(SCHOOL_TIME_ZONE))) {
            return NeedRequestStatus.PENDING;
        }
        return request.getStatus();
    }

    /**
     * The requester edits within an hour of submitting; an admin edits any
     * still-pending request. Nobody edits once a decision has been taken —
     * otherwise the lines change under the approvers' names after the fact.
     */
    public static boolean canEdit(NeedRequest request, Employee actor) {
        if (request.getArchivedAt() != null || effectiveStatus(request) != NeedRequestStatus.PENDING) return false;
        if (request.getRequester().getId().equals(actor.getId())) {
            return Instant.now().isBefore(editableUntil(request));
        }
        return actor.getPermissions().stream().map(Permission::getKey).anyMatch("emp.manage"::equals);
    }

    /**
     * Trimming or dropping a line changes what the requester asked for, which
     * is a separate act from agreeing to it — so it is a separate permission.
     * Everyone who can decide still sees the lines; only a holder of this may
     * alter them.
     */
    public static boolean canEditLines(Employee actor) {
        return actor != null
                && actor.getPermissions().stream().map(Permission::getKey).anyMatch(EDIT_LINES_PERMISSION::equals);
    }

    public static Instant editableUntil(NeedRequest request) {
        return request.getCreatedAt().plusSeconds(EDIT_WINDOW_MINUTES * 60L);
    }

    @Transactional
    public NeedRequest update(UUID id, CreateNeedRequestRequest update, Employee actor) {
        NeedRequest request = openRequest(id);
        if (!canEdit(request, actor)) {
            throw RequestWorkflowErrors.editWindowClosed();
        }

        request.setDepartment(resolveRequesterDepartment(update.departmentId(), request.getRequester()));
        request.setCategory(resolveCategory(update.categoryId()));
        request.setRoom(resolveRoom(update.roomId()));
        request.setNotes(update.notes());

        List<NeedRequestLineRequest> lines = update.lines() == null ? List.of() : update.lines();
        boolean hasNotes = update.notes() != null && !update.notes().isBlank();
        if (lines.isEmpty() && !hasNotes) {
            throw ApiException.validation(
                    "A request needs at least one line, or notes describing it",
                    Map.of("lines", "must not be empty unless notes are provided"));
        }

        request.getLines().clear();
        for (NeedRequestLineRequest lineRequest : lines) {
            if (lineRequest.quantityRequested() <= 0) {
                throw ApiException.validation(
                        "Line quantity must be positive", Map.of("quantityRequested", "must be > 0"));
            }
            InventoryItem item = inventoryItemRepository
                    .findById(lineRequest.inventoryItemId())
                    .orElseThrow(() -> ApiException.validation(
                            "Inventory item not found", Map.of("inventoryItemId", "does not exist")));
            NeedRequestLine line = new NeedRequestLine();
            line.setNeedRequest(request);
            line.setInventoryItem(item);
            line.setQuantityRequested(lineRequest.quantityRequested());
            request.getLines().add(line);
        }

        addAction(request, actor, "EDIT", null);
        return save(request, actor, "NEED_REQUEST_EDITED");
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
        needRequest.setRequestNumber(needRequestRepository.nextRequestNumber());
        needRequest.setRequester(requester);
        needRequest.setDepartment(resolveRequesterDepartment(request.departmentId(), requester));
        needRequest.setCategory(resolveCategory(request.categoryId()));
        needRequest.setRoom(resolveRoom(request.roomId()));
        needRequest.setNotes(request.notes());
        needRequest.setStatus(NeedRequestStatus.PENDING);
        needRequest.setSuggestedStartDate(suggestedStartDateCalculator.from(LocalDate.now(SCHOOL_TIME_ZONE)));

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

    // --- First-level decisions -------------------------------------------

    @Transactional
    public NeedRequest approve(UUID id, RequestDecisionRequest decision, Employee actor) {
        NeedRequest request = openRequest(id);
        requireStatus(request, NeedRequestStatus.PENDING);
        requireWithinScope(request, actor);
        requireNotRepeatingOverturnedDecision(request, actor, "APPROVE");

        NeedRequestAction action = addAction(request, actor, "APPROVE", comment(decision));
        applyLineEdits(request, action, decision, actor);
        // One level or two, per the school's setting for this system. With one
        // level the decision settles the request outright; with two it parks
        // until a different official counter-signs.
        request.setStatus(
                reviewPolicyService.warehouseTwoLevel()
                        ? NeedRequestStatus.APPROVED_UNDER_REVIEW
                        : NeedRequestStatus.APPROVED);
        request.setPostponedUntil(null);
        request.setReturnedBySenior(false);
        return save(request, actor, "NEED_REQUEST_APPROVED");
    }

    @Transactional
    public NeedRequest reject(UUID id, RequestDecisionRequest decision, Employee actor) {
        NeedRequest request = openRequest(id);
        requireStatus(request, NeedRequestStatus.PENDING);
        requireWithinScope(request, actor);
        requireNotRepeatingOverturnedDecision(request, actor, "REJECT");
        requireReason(decision);

        addAction(request, actor, "REJECT", comment(decision));
        request.setStatus(
                reviewPolicyService.warehouseTwoLevel()
                        ? NeedRequestStatus.REJECTED_UNDER_REVIEW
                        : NeedRequestStatus.REJECTED);
        request.setPostponedUntil(null);
        request.setReturnedBySenior(false);
        return save(request, actor, "NEED_REQUEST_REJECTED");
    }

    @Transactional
    public NeedRequest postpone(UUID id, RequestDecisionRequest decision, Employee actor) {
        NeedRequest request = openRequest(id);
        requireStatus(request, NeedRequestStatus.PENDING);
        requireWithinScope(request, actor);
        requireReason(decision);
        applyPostponement(request, actor, "POSTPONE", decision);
        return save(request, actor, "NEED_REQUEST_POSTPONED");
    }

    // --- Second-level review ---------------------------------------------

    @Transactional
    public NeedRequest countersign(UUID id, RequestDecisionRequest decision, Employee actor) {
        NeedRequest request = openRequest(id);
        requireStatus(request, NeedRequestStatus.APPROVED_UNDER_REVIEW, NeedRequestStatus.REJECTED_UNDER_REVIEW);
        requireWithinScope(request, actor);
        requireDistinctFromFirstLevel(request, actor);

        boolean approving = request.getStatus() == NeedRequestStatus.APPROVED_UNDER_REVIEW;
        NeedRequestAction action =
                addAction(request, actor, approving ? "COUNTERSIGN_APPROVE" : "COUNTERSIGN_REJECT", comment(decision));
        if (approving) {
            applyLineEdits(request, action, decision, actor);
        }
        request.setStatus(approving ? NeedRequestStatus.APPROVED : NeedRequestStatus.REJECTED);
        return save(request, actor, approving ? "NEED_REQUEST_COUNTERSIGNED" : "NEED_REQUEST_REJECTION_CONFIRMED");
    }

    @Transactional
    public NeedRequest overturn(UUID id, OverturnRequest overturn, Employee actor) {
        NeedRequest request = openRequest(id);
        requireStatus(request, NeedRequestStatus.APPROVED_UNDER_REVIEW, NeedRequestStatus.REJECTED_UNDER_REVIEW);
        requireWithinScope(request, actor);
        requireDistinctFromFirstLevel(request, actor);

        boolean wasApproval = request.getStatus() == NeedRequestStatus.APPROVED_UNDER_REVIEW;
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
                NeedRequestAction action = addAction(request, actor, "OVERTURN_APPROVE", comment(decision));
                applyLineEdits(request, action, decision, actor);
                request.setStatus(NeedRequestStatus.APPROVED);
                request.setPostponedUntil(null);
            }
            case REJECT -> {
                requireReason(decision);
                addAction(request, actor, "OVERTURN_REJECT", comment(decision));
                request.setStatus(NeedRequestStatus.REJECTED);
                request.setPostponedUntil(null);
            }
        }
        return save(request, actor, "NEED_REQUEST_OVERTURNED");
    }

    // --- Delivery and receipt --------------------------------------------

    /**
     * Records what actually left the warehouse, and closes the delivery in one
     * pass. Issuing less than was approved is allowed and does not leave the
     * request open for a second handover: the shortfall is written into the
     * action log against this delivery, so it is visible rather than pending.
     *
     * The approved quantities are deliberately left alone. Reducing them to
     * what was issued would record the shortfall too, but a later
     * reject-receipt returns the request to APPROVED, and the re-delivery
     * would then be capped at the reduced figure — quietly shrinking what the
     * approver granted.
     */
    @Transactional
    public NeedRequest finish(UUID id, FinishNeedRequestRequest request, Employee actor) {
        NeedRequest needRequest = openRequest(id);
        requireStatus(needRequest, NeedRequestStatus.APPROVED);

        Map<UUID, Integer> issuedByLineId = new HashMap<>();
        if (request != null && request.lines() != null) {
            for (var finishLine : request.lines()) {
                issuedByLineId.put(finishLine.lineId(), finishLine.quantityIssued());
            }
        }

        NeedRequestAction action = addAction(needRequest, actor, "FINISH", request == null ? null : request.notes());

        int issuedNow = 0;
        for (NeedRequestLine line : needRequest.getLines()) {
            if (line.isRemoved()) {
                line.setQuantityIssued(0);
                continue;
            }
            int approved = line.effectiveQuantity();

            Integer requestedIssue = issuedByLineId.get(line.getId());
            int quantityIssued = requestedIssue != null ? requestedIssue : approved;

            // Deliberately NOT capped at the approved quantity. The storekeeper
            // records what physically left the warehouse, which can be more or
            // less than the approval; the log keeps both figures. Stock is the
            // real constraint, checked below — issuing what is not there is the
            // only outcome that cannot be true.
            if (quantityIssued < 0) {
                throw RequestWorkflowErrors.issuedOutOfRange();
            }

            if (quantityIssued > 0) {
                InventoryItem item = line.getInventoryItem();
                if (item.getQuantity() < quantityIssued) {
                    throw RequestWorkflowErrors.insufficientStock(item.getCode());
                }
                item.setQuantity(item.getQuantity() - quantityIssued);
                inventoryItemRepository.save(item);
            }

            line.setQuantityIssued(quantityIssued);
            issuedNow += quantityIssued;

            // Any difference from the approved figure, in either direction,
            // attributed to this delivery — so the card can say "5 approved,
            // 3 delivered" instead of leaving it to arithmetic.
            if (quantityIssued != approved) {
                recordLineEdit(action, line, approved, quantityIssued, false);
            }
        }

        // A delivery of nothing would otherwise advance the request while
        // handing over nothing. A request with no lines is described in notes
        // only and has nothing to count.
        if (issuedNow == 0 && !needRequest.getLines().isEmpty()) {
            throw RequestWorkflowErrors.nothingDelivered();
        }

        needRequest.setStatus(NeedRequestStatus.DELIVERED);
        return save(needRequest, actor, "NEED_REQUEST_FINISHED");
    }

    @Transactional
    public NeedRequest receive(UUID id, Employee actor) {
        NeedRequest request = openRequest(id);
        requireStatus(request, NeedRequestStatus.DELIVERED);
        requireRequester(request, actor);

        request.setStatus(NeedRequestStatus.CLOSED);
        addAction(request, actor, "RECEIVE", null);
        return save(request, actor, "NEED_REQUEST_RECEIVED");
    }

    /**
     * The requester says the delivery does not match. The request goes back to
     * APPROVED and every issued quantity returns to stock, so reopening the
     * delivery modal starts from the same numbers without double-counting.
     */
    @Transactional
    public NeedRequest rejectReceipt(UUID id, RequestDecisionRequest decision, Employee actor) {
        NeedRequest request = openRequest(id);
        requireStatus(request, NeedRequestStatus.DELIVERED);
        requireRequester(request, actor);
        requireReason(decision);

        for (NeedRequestLine line : request.getLines()) {
            Integer issued = line.getQuantityIssued();
            if (issued != null && issued > 0) {
                InventoryItem item = line.getInventoryItem();
                item.setQuantity(item.getQuantity() + issued);
                inventoryItemRepository.save(item);
            }
            // Cleared, not kept: finish() adds to what was already issued, so
            // leaving the old figure here would make the redelivery think
            // nothing is outstanding.
            line.setQuantityIssued(null);
        }

        request.setStatus(NeedRequestStatus.APPROVED);
        addAction(request, actor, "REJECT_RECEIPT", comment(decision));
        return save(request, actor, "NEED_REQUEST_RECEIPT_REJECTED");
    }

    // --- Archive ---------------------------------------------------------

    @Transactional
    public NeedRequest archive(UUID id, Employee actor) {
        NeedRequest request = get(id);
        if (request.getArchivedAt() != null) {
            throw RequestWorkflowErrors.alreadyArchived();
        }
        requireStatus(request, NeedRequestStatus.CLOSED);
        request.setArchivedAt(Instant.now());
        request.setArchivedBy(actor);
        addAction(request, actor, "ARCHIVE", null);
        return save(request, actor, "NEED_REQUEST_ARCHIVED");
    }

    // --- Internals -------------------------------------------------------

    private NeedRequest openRequest(UUID id) {
        NeedRequest request = get(id);
        if (request.getArchivedAt() != null) {
            throw RequestWorkflowErrors.archived();
        }
        return request;
    }

    private NeedRequest save(NeedRequest request, Employee actor, String auditAction) {
        NeedRequest saved = needRequestRepository.save(request);
        auditService.record(actor, auditAction, "NeedRequest", saved.getId());
        return saved;
    }

    private void applyPostponement(
            NeedRequest request, Employee actor, String action, RequestDecisionRequest decision) {
        LocalDate until = decision == null ? null : decision.postponedUntil();
        if (until == null) {
            throw RequestWorkflowErrors.postponeDateRequired();
        }
        if (!until.isAfter(LocalDate.now(SCHOOL_TIME_ZONE))) {
            throw ApiException.validation(
                    "The postponement date must be in the future", Map.of("postponedUntil", "must be after today"));
        }
        request.setStatus(NeedRequestStatus.POSTPONED);
        request.setPostponedUntil(until);
        addAction(request, actor, action, comment(decision));
    }

    /**
     * Line trims and drops made inside a decision modal. The before/after pair
     * is recorded on the action that made it, so a first-level trim and a
     * later counter-sign trim stay separately attributable.
     */
    private void applyLineEdits(
            NeedRequest request, NeedRequestAction action, RequestDecisionRequest decision, Employee actor) {
        if (decision == null) return;
        Map<UUID, NeedRequestLine> byId = new HashMap<>();
        for (NeedRequestLine line : request.getLines()) {
            byId.put(line.getId(), line);
        }

        for (RequestDecisionRequest.DecisionLine edit : decision.linesOrEmpty()) {
            NeedRequestLine line = byId.get(edit.lineId());
            if (line == null) {
                throw RequestWorkflowErrors.unknownLine();
            }

            int before = line.effectiveQuantity();
            boolean removalChanged = edit.removed() != line.isRemoved();
            boolean quantityChanged =
                    !edit.removed() && edit.quantity() != null && edit.quantity() != before;

            // Checked here rather than on the whole payload: a decision that
            // sends the lines back unchanged is not an edit, and refusing it
            // would block approving from anyone without this permission.
            if ((removalChanged || quantityChanged) && !canEditLines(actor)) {
                throw RequestWorkflowErrors.lineEditNotPermitted();
            }

            if (edit.removed()) {
                if (removalChanged) {
                    line.setRemoved(true);
                    recordLineEdit(action, line, before, null, true);
                }
                continue;
            }

            // Putting back a line an earlier decision dropped. The
            // counter-signer reviews the whole request, including what the
            // first official took out of it — otherwise a deletion at the
            // first level is final in everything but name.
            if (removalChanged) {
                line.setRemoved(false);
                // before == after marks a restore: the line is back, at the
                // quantity it already carried.
                recordLineEdit(action, line, before, before, false);
            }

            if (!quantityChanged) continue;
            if (edit.quantity() <= 0) {
                throw RequestWorkflowErrors.quantityMustBePositive();
            }
            // A decision may cut what was asked for or drop it, never grant
            // more than was requested: raising it here would commit stock
            // nobody asked for and would not be visible to the requester as
            // anything they submitted.
            if (edit.quantity() > line.getQuantityRequested()) {
                throw RequestWorkflowErrors.quantityAboveRequested();
            }
            line.setQuantityApproved(edit.quantity());
            recordLineEdit(action, line, before, edit.quantity(), false);
        }

        // Only meaningful for requests that have lines at all: submit accepts a
        // notes-only request, and that shape has nothing to keep.
        if (!request.getLines().isEmpty() && request.getLines().stream().allMatch(NeedRequestLine::isRemoved)) {
            throw RequestWorkflowErrors.noLinesLeft();
        }
    }

    private void recordLineEdit(
            NeedRequestAction action, NeedRequestLine line, int before, Integer after, boolean removed) {
        NeedRequestActionLine edit = new NeedRequestActionLine();
        edit.setAction(action);
        edit.assignLine(line);
        edit.setQuantityBefore(before);
        edit.setQuantityAfter(after);
        edit.setRemoved(removed);
        action.getLineEdits().add(edit);
    }

    private void requireStatus(NeedRequest request, NeedRequestStatus... allowed) {
        NeedRequestStatus current = effectiveStatus(request);
        for (NeedRequestStatus status : allowed) {
            if (current == status) return;
        }
        throw ApiException.conflict(
                "Request is not in a state that allows this action (current: " + current + ")");
    }

    private void requireRequester(NeedRequest request, Employee actor) {
        if (!request.getRequester().getId().equals(actor.getId())) {
            throw ApiException.forbidden("Only the requester can confirm or reject receipt");
        }
    }

    /**
     * A two-stage review where one employee can act at both stages is not a
     * review. Permissions do not settle this — one employee may legitimately
     * hold both keys — so the check is on the actor id.
     */
    private void requireDistinctFromFirstLevel(NeedRequest request, Employee actor) {
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

    /**
     * After a senior overturn the request lands back with the same official,
     * who could otherwise simply repeat the decision that was just overturned.
     */
    private void requireNotRepeatingOverturnedDecision(NeedRequest request, Employee actor, String action) {
        if (!request.isReturnedBySenior()) return;
        request.getActions().stream()
                .filter(entry -> action.equals(entry.getAction()))
                .reduce((first, second) -> second)
                .filter(entry -> entry.getActor() != null && entry.getActor().getId().equals(actor.getId()))
                .ifPresent(entry -> {
                    throw ApiException.forbidden(
                            "This decision was overturned — another official must take it");
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

    private NeedRequestAction addAction(NeedRequest request, Employee actor, String action, String reason) {
        NeedRequestAction entry = new NeedRequestAction();
        entry.setNeedRequest(request);
        entry.setActor(actor);
        entry.setAction(action);
        entry.setReason(reason);
        request.getActions().add(entry);
        return entry;
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
