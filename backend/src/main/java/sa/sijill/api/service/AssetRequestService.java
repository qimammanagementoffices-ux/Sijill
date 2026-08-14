package sa.sijill.api.service;

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
import sa.sijill.api.repository.*;
import sa.sijill.api.web.dto.AssetRequestLineRequest;
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

    public AssetRequestService(
            AssetRequestRepository assetRequestRepository,
            AssetRepository assetRepository,
            CategoryRepository categoryRepository,
            DepartmentRepository departmentRepository,
            RoomRepository roomRepository,
            AssetTransferService assetTransferService,
            SuggestedStartDateCalculator suggestedStartDateCalculator,
            AuditService auditService) {
        this.assetRequestRepository = assetRequestRepository;
        this.assetRepository = assetRepository;
        this.categoryRepository = categoryRepository;
        this.departmentRepository = departmentRepository;
        this.roomRepository = roomRepository;
        this.assetTransferService = assetTransferService;
        this.suggestedStartDateCalculator = suggestedStartDateCalculator;
        this.auditService = auditService;
    }

    public Page<AssetRequest> search(AssetRequestStatus status, UUID restrictToRequesterId, String q, Pageable pageable) {
        return assetRequestRepository.search(status, restrictToRequesterId, q, pageable);
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
    public AssetRequest approve(UUID id, Employee actor) {
        AssetRequest request = get(id);
        requireStatus(request, AssetRequestStatus.PENDING, AssetRequestStatus.POSTPONED);
        request.setStatus(AssetRequestStatus.APPROVED);
        addAction(request, actor, "APPROVE", null);
        AssetRequest saved = assetRequestRepository.save(request);
        auditService.record(actor, "ASSET_REQUEST_APPROVED", "AssetRequest", saved.getId());
        return saved;
    }

    @Transactional
    public AssetRequest reject(UUID id, String reason, Employee actor) {
        AssetRequest request = get(id);
        requireStatus(request, AssetRequestStatus.PENDING, AssetRequestStatus.APPROVED, AssetRequestStatus.POSTPONED);
        request.setStatus(AssetRequestStatus.REJECTED);
        addAction(request, actor, "REJECT", reason);
        AssetRequest saved = assetRequestRepository.save(request);
        auditService.record(actor, "ASSET_REQUEST_REJECTED", "AssetRequest", saved.getId());
        return saved;
    }

    @Transactional
    public AssetRequest postpone(UUID id, String reason, Employee actor) {
        AssetRequest request = get(id);
        requireStatus(request, AssetRequestStatus.PENDING, AssetRequestStatus.APPROVED);
        request.setStatus(AssetRequestStatus.POSTPONED);
        addAction(request, actor, "POSTPONE", reason);
        AssetRequest saved = assetRequestRepository.save(request);
        auditService.record(actor, "ASSET_REQUEST_POSTPONED", "AssetRequest", saved.getId());
        return saved;
    }

    @Transactional
    public AssetRequest finish(UUID id, Employee actor) {
        AssetRequest request = get(id);
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
        for (AssetRequestStatus status : allowed) {
            if (request.getStatus() == status) return;
        }
        throw ApiException.conflict(
                "Request is not in a state that allows this action (current: " + request.getStatus() + ")");
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
