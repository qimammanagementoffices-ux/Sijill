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
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.AssetRequestRepository;
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
    private final AssetTransferService assetTransferService;
    private final SuggestedStartDateCalculator suggestedStartDateCalculator;
    private final AuditService auditService;

    public AssetRequestService(
            AssetRequestRepository assetRequestRepository,
            AssetRepository assetRepository,
            AssetTransferService assetTransferService,
            SuggestedStartDateCalculator suggestedStartDateCalculator,
            AuditService auditService) {
        this.assetRequestRepository = assetRequestRepository;
        this.assetRepository = assetRepository;
        this.assetTransferService = assetTransferService;
        this.suggestedStartDateCalculator = suggestedStartDateCalculator;
        this.auditService = auditService;
    }

    public Page<AssetRequest> search(AssetRequestStatus status, UUID restrictToRequesterId, Pageable pageable) {
        return assetRequestRepository.search(status, restrictToRequesterId, pageable);
    }

    public AssetRequest get(UUID id) {
        return assetRequestRepository.findById(id).orElseThrow(() -> ApiException.notFound("Request not found"));
    }

    @Transactional
    public AssetRequest submit(SubmitAssetRequestRequest request, Employee requester) {
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

        assetTransferService.transfer(
                request.getAsset().getId(),
                null,
                request.getRequester(),
                "Asset request " + request.getId() + " fulfilled",
                actor);

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
}
