package sa.sijill.api.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
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
import sa.sijill.api.web.dto.AssetRequestLineRequest;
import sa.sijill.api.web.dto.OverturnRequest;
import sa.sijill.api.web.dto.RequestDecisionRequest;
import sa.sijill.api.web.dto.SubmitAssetRequestRequest;

/**
 * Custody/assignment request per docs/decision-record.md: an employee
 * requests a specific asset; approve -> finish assigns it to them, and the
 * finish step delegates the actual custody change to AssetTransferService
 * so it's recorded in asset_transfer history exactly like a direct admin
 * transfer would be. Same D3 collapsed-closure pattern as need/maintenance
 * requests (fulfiller's finish action is the closing action).
 */
@Service
public class AssetRequestService {

    private final AssetRequestRepository assetRequestRepository;
    private final AssetRepository assetRepository;
    private final CategoryRepository categoryRepository;
    private final DepartmentRepository departmentRepository;
    private final RoomRepository roomRepository;
    private final AssetTransferService assetTransferService;
    private final SuggestedStartDateCalculator suggestedStartDateCalculator;
    private final AuditService auditService;
    private final ReviewPolicyService reviewPolicyService;

    public AssetRequestService(
            AssetRequestRepository assetRequestRepository,
            AssetRepository assetRepository,
            CategoryRepository categoryRepository,
            DepartmentRepository departmentRepository,
            RoomRepository roomRepository,
            AssetTransferService assetTransferService,
            SuggestedStartDateCalculator suggestedStartDateCalculator,
            AuditService auditService,
            ReviewPolicyService reviewPolicyService) {
        this.assetRequestRepository = assetRequestRepository;
        this.assetRepository = assetRepository;
        this.categoryRepository = categoryRepository;
        this.departmentRepository = departmentRepository;
        this.roomRepository = roomRepository;
        this.assetTransferService = assetTransferService;
        this.suggestedStartDateCalculator = suggestedStartDateCalculator;
        this.auditService = auditService;
        this.reviewPolicyService = reviewPolicyService;
    }

    @Transactional
    public Page<AssetRequest> search(
            AssetRequestStatus status,
            UUID restrictToRequesterId,
            String q,
            boolean archived,
            boolean underReview,
            Pageable pageable) {
        Page<AssetRequest> page = assetRequestRepository.search(
                status, restrictToRequesterId, q, archived, underReview, LocalDate.now(), pageable);
        page.getContent().forEach(this::materialiseResurface);
        return page;
    }

    /** See NeedRequestService.materialiseResurface for why this is a write during a read. */
    private void materialiseResurface(AssetRequest request) {
        if (request.getStatus() != AssetRequestStatus.POSTPONED) return;
        if (request.getPostponedUntil() == null || request.getPostponedUntil().isAfter(LocalDate.now())) return;

        request.setStatus(AssetRequestStatus.PENDING);
        addAction(request, null, "RESURFACE", null);
        assetRequestRepository.save(request);
    }

    /** A postponed request whose date has arrived counts as pending everywhere. */
    public static AssetRequestStatus effectiveStatus(AssetRequest request) {
        if (request.getStatus() == AssetRequestStatus.POSTPONED
                && request.getPostponedUntil() != null
                && !request.getPostponedUntil().isAfter(LocalDate.now())) {
            return AssetRequestStatus.PENDING;
        }
        return request.getStatus();
    }

    public AssetRequest get(UUID id) {
        return assetRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Request not found"));
    }

    @Transactional
    public AssetRequest submit(SubmitAssetRequestRequest request, Employee requester) {
        if (request.purpose() != null) {
            return submitLegacyStyle(request, requester);
        }

        // Backward compatibility for clients created before the legacy-style
        // purpose tabs: the original contract requested one existing asset.
        if (request.assetId() == null) {
            throw ApiException.validation("Asset is required", Map.of("assetId", "must not be blank"));
        }
        Asset asset = assetRepository
                .findById(request.assetId())
                .orElseThrow(() -> ApiException.validation("Asset not found", Map.of("assetId", "does not exist")));

        AssetRequest assetRequest = new AssetRequest();
        assetRequest.setRequester(requester);
        assetRequest.setAsset(asset);
        assetRequest.setReason(request.reason());
        assetRequest.setStatus(AssetRequestStatus.PENDING);
        assetRequest.setSuggestedStartDate(suggestedStartDateCalculator.from(LocalDate.now()));

        addAction(assetRequest, requester, "SUBMIT", null);
        AssetRequest saved = assetRequestRepository.save(assetRequest);
        auditService.record(requester, "ASSET_REQUEST_SUBMITTED", "AssetRequest", saved.getId());
        return saved;
    }

    private AssetRequest submitLegacyStyle(SubmitAssetRequestRequest request, Employee requester) {
        Department department = resolveRequesterDepartment(request.departmentId(), requester);
        Room room = resolveRoom(request.roomId(), "roomId");
        if (room != null
                && room.getDepartment() != null
                && !room.getDepartment().getId().equals(department.getId())) {
            throw ApiException.validation("Room does not belong to the selected department", Map.of("roomId", "wrong department"));
        }

        List<AssetRequestLineRequest> requestedLines = request.lines() == null ? List.of() : request.lines();
        if (requestedLines.isEmpty()) {
            throw ApiException.validation("Select at least one category or asset", Map.of("lines", "must not be empty"));
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw ApiException.validation("Description is required", Map.of("reason", "must not be blank"));
        }

        Room destinationRoom = request.purpose() == AssetRequestPurpose.TRANSFER
                ? resolveRequiredRoom(request.destinationRoomId(), "destinationRoomId")
                : null;
        if (destinationRoom != null && room != null && destinationRoom.getId().equals(room.getId())) {
            throw ApiException.validation(
                    "Destination room must be different", Map.of("destinationRoomId", "must differ from roomId"));
        }

        AssetRequest assetRequest = new AssetRequest();
        assetRequest.setRequester(requester);
        assetRequest.setDepartment(department);
        assetRequest.setRoom(room);
        assetRequest.setDestinationRoom(destinationRoom);
        assetRequest.setPurpose(request.purpose());
        assetRequest.setPriority(request.priority() == null ? AssetRequestPriority.NORMAL : request.priority());
        assetRequest.setReason(request.reason().trim());
        assetRequest.setStatus(AssetRequestStatus.PENDING);
        assetRequest.setSuggestedStartDate(suggestedStartDateCalculator.from(LocalDate.now()));

        Set<UUID> selectedIds = new HashSet<>();
        for (AssetRequestLineRequest requestedLine : requestedLines) {
            AssetRequestLine line = new AssetRequestLine();
            line.setAssetRequest(assetRequest);
            if (request.purpose() == AssetRequestPurpose.PURCHASE) {
                if (requestedLine.categoryId() == null || requestedLine.quantity() <= 0) {
                    throw ApiException.validation(
                            "Purchase lines need a category and positive quantity", Map.of("lines", "invalid purchase line"));
                }
                if (!selectedIds.add(requestedLine.categoryId())) {
                    throw ApiException.validation("Duplicate category", Map.of("lines", "contains duplicate category"));
                }
                Category category = categoryRepository
                        .findById(requestedLine.categoryId())
                        .filter(candidate -> candidate.getDomain() == Domain.ASSET && candidate.isActive())
                        .orElseThrow(() -> ApiException.validation(
                                "Asset category not found", Map.of("categoryId", "does not exist")));
                line.setCategory(category);
                line.setQuantity(requestedLine.quantity());
            } else {
                if (requestedLine.assetId() == null || !selectedIds.add(requestedLine.assetId())) {
                    throw ApiException.validation("Select each asset once", Map.of("lines", "invalid or duplicate asset"));
                }
                Asset asset = assetRepository
                        .findById(requestedLine.assetId())
                        .orElseThrow(() -> ApiException.validation("Asset not found", Map.of("assetId", "does not exist")));
                if (room != null && (asset.getRoom() == null || !asset.getRoom().getId().equals(room.getId()))) {
                    throw ApiException.validation("Asset is not in the selected room", Map.of("assetId", "wrong room"));
                }
                line.setAsset(asset);
                line.setQuantity(1);
                if (assetRequest.getAsset() == null) assetRequest.setAsset(asset);
            }
            assetRequest.getLines().add(line);
        }

        addAction(assetRequest, requester, "SUBMIT", null);
        AssetRequest saved = assetRequestRepository.save(assetRequest);
        auditService.record(requester, "ASSET_REQUEST_SUBMITTED", "AssetRequest", saved.getId());
        return saved;
    }

    @Transactional
    public AssetRequest approve(UUID id, RequestDecisionRequest decision, Employee actor) {
        AssetRequest request = openRequest(id);
        requireStatus(request, AssetRequestStatus.PENDING);
        requireNotRepeatingOverturnedDecision(request, actor, "APPROVE");

        addAction(request, actor, "APPROVE", comment(decision));
        // One level or two, per the school's setting for this system.
        request.setStatus(
                reviewPolicyService.assetTwoLevel()
                        ? AssetRequestStatus.APPROVED_UNDER_REVIEW
                        : AssetRequestStatus.APPROVED);
        request.setPostponedUntil(null);
        request.setReturnedBySenior(false);
        return save(request, actor, "ASSET_REQUEST_APPROVED");
    }

    @Transactional
    public AssetRequest reject(UUID id, RequestDecisionRequest decision, Employee actor) {
        AssetRequest request = openRequest(id);
        requireStatus(request, AssetRequestStatus.PENDING);
        requireNotRepeatingOverturnedDecision(request, actor, "REJECT");
        requireReason(decision);

        addAction(request, actor, "REJECT", comment(decision));
        request.setStatus(
                reviewPolicyService.assetTwoLevel()
                        ? AssetRequestStatus.REJECTED_UNDER_REVIEW
                        : AssetRequestStatus.REJECTED);
        request.setPostponedUntil(null);
        request.setReturnedBySenior(false);
        return save(request, actor, "ASSET_REQUEST_REJECTED");
    }

    @Transactional
    public AssetRequest postpone(UUID id, RequestDecisionRequest decision, Employee actor) {
        AssetRequest request = openRequest(id);
        requireStatus(request, AssetRequestStatus.PENDING);
        requireReason(decision);
        applyPostponement(request, actor, "POSTPONE", decision);
        return save(request, actor, "ASSET_REQUEST_POSTPONED");
    }

    @Transactional
    public AssetRequest countersign(UUID id, RequestDecisionRequest decision, Employee actor) {
        AssetRequest request = openRequest(id);
        requireStatus(request, AssetRequestStatus.APPROVED_UNDER_REVIEW, AssetRequestStatus.REJECTED_UNDER_REVIEW);
        requireDistinctFromFirstLevel(request, actor);

        boolean approving = request.getStatus() == AssetRequestStatus.APPROVED_UNDER_REVIEW;
        addAction(request, actor, approving ? "COUNTERSIGN_APPROVE" : "COUNTERSIGN_REJECT", comment(decision));
        request.setStatus(approving ? AssetRequestStatus.APPROVED : AssetRequestStatus.REJECTED);
        return save(request, actor, approving ? "ASSET_REQUEST_COUNTERSIGNED" : "ASSET_REQUEST_REJECTION_CONFIRMED");
    }

    @Transactional
    public AssetRequest overturn(UUID id, OverturnRequest overturn, Employee actor) {
        AssetRequest request = openRequest(id);
        requireStatus(request, AssetRequestStatus.APPROVED_UNDER_REVIEW, AssetRequestStatus.REJECTED_UNDER_REVIEW);
        requireDistinctFromFirstLevel(request, actor);

        boolean wasApproval = request.getStatus() == AssetRequestStatus.APPROVED_UNDER_REVIEW;
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
                request.setStatus(AssetRequestStatus.APPROVED);
                request.setPostponedUntil(null);
            }
            case REJECT -> {
                requireReason(decision);
                addAction(request, actor, "OVERTURN_REJECT", comment(decision));
                request.setStatus(AssetRequestStatus.REJECTED);
                request.setPostponedUntil(null);
            }
        }
        return save(request, actor, "ASSET_REQUEST_OVERTURNED");
    }

    @Transactional
    public AssetRequest archive(UUID id, Employee actor) {
        AssetRequest request = get(id);
        if (request.getArchivedAt() != null) {
            throw RequestWorkflowErrors.alreadyArchived();
        }
        request.setArchivedAt(Instant.now());
        request.setArchivedBy(actor);
        addAction(request, actor, "ARCHIVE", null);
        return save(request, actor, "ASSET_REQUEST_ARCHIVED");
    }

    @Transactional
    public AssetRequest restore(UUID id, Employee actor) {
        AssetRequest request = get(id);
        if (request.getArchivedAt() == null) {
            throw RequestWorkflowErrors.notArchived();
        }
        request.setArchivedAt(null);
        request.setArchivedBy(null);
        addAction(request, actor, "RESTORE", null);
        return save(request, actor, "ASSET_REQUEST_RESTORED");
    }

    private AssetRequest openRequest(UUID id) {
        AssetRequest request = get(id);
        if (request.getArchivedAt() != null) {
            throw RequestWorkflowErrors.archived();
        }
        return request;
    }

    private AssetRequest save(AssetRequest request, Employee actor, String auditAction) {
        AssetRequest saved = assetRequestRepository.save(request);
        auditService.record(actor, auditAction, "AssetRequest", saved.getId());
        return saved;
    }

    private void applyPostponement(
            AssetRequest request, Employee actor, String action, RequestDecisionRequest decision) {
        LocalDate until = decision == null ? null : decision.postponedUntil();
        if (until == null) {
            throw RequestWorkflowErrors.postponeDateRequired();
        }
        if (!until.isAfter(LocalDate.now())) {
            throw ApiException.validation(
                    "The postponement date must be in the future", Map.of("postponedUntil", "must be after today"));
        }
        request.setStatus(AssetRequestStatus.POSTPONED);
        request.setPostponedUntil(until);
        addAction(request, actor, action, comment(decision));
    }

    private void requireDistinctFromFirstLevel(AssetRequest request, Employee actor) {
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

    private void requireNotRepeatingOverturnedDecision(AssetRequest request, Employee actor, String action) {
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

    @Transactional
    public AssetRequest finish(UUID id, Employee actor) {
        AssetRequest request = openRequest(id);
        requireStatus(request, AssetRequestStatus.APPROVED);

        if (request.getPurpose() == AssetRequestPurpose.TRANSFER) {
            for (AssetRequestLine line : request.getLines()) {
                Asset asset = line.getAsset();
                assetTransferService.transfer(
                        asset.getId(),
                        request.getDestinationRoom().getId(),
                        asset.getCustodian(),
                        "Asset request " + request.getId() + " fulfilled",
                        actor);
            }
        } else if (request.getPurpose() == null) {
            assetTransferService.transfer(
                    request.getAsset().getId(),
                    null,
                    request.getRequester(),
                    "Asset request " + request.getId() + " fulfilled",
                    actor);
        }

        request.setStatus(AssetRequestStatus.CLOSED);
        addAction(request, actor, "FINISH", null);
        AssetRequest saved = assetRequestRepository.save(request);
        auditService.record(actor, "ASSET_REQUEST_FINISHED", "AssetRequest", saved.getId());
        return saved;
    }

    private void requireStatus(AssetRequest request, AssetRequestStatus... allowed) {
        AssetRequestStatus current = effectiveStatus(request);
        for (AssetRequestStatus status : allowed) {
            if (current == status) return;
        }
        throw RequestWorkflowErrors.wrongStatus(current.name());
    }

    private void addAction(AssetRequest request, Employee actor, String action, String reason) {
        AssetRequestAction entry = new AssetRequestAction();
        entry.setAssetRequest(request);
        entry.setActor(actor);
        entry.setAction(action);
        entry.setReason(reason);
        request.getActions().add(entry);
    }

    private Department resolveRequesterDepartment(UUID id, Employee requester) {
        if (id == null) {
            throw ApiException.validation("Department is required", Map.of("departmentId", "must not be blank"));
        }
        Department department = departmentRepository.findById(id).orElseThrow(() ->
                ApiException.validation("Department not found", Map.of("departmentId", "does not exist")));
        if (requester.getDepartments().stream().noneMatch(assigned -> assigned.getId().equals(id))) {
            throw ApiException.forbidden("Department is not assigned to this employee");
        }
        return department;
    }

    private Room resolveRoom(UUID id, String field) {
        if (id == null) return null;
        return roomRepository
                .findById(id)
                .orElseThrow(() -> ApiException.validation("Room not found", Map.of(field, "does not exist")));
    }

    private Room resolveRequiredRoom(UUID id, String field) {
        if (id == null) {
            throw ApiException.validation("Destination room is required", Map.of(field, "must not be blank"));
        }
        return resolveRoom(id, field);
    }
}
