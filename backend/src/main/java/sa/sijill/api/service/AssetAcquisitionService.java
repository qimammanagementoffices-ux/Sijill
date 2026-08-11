package sa.sijill.api.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetAcquisition;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.AssetAcquisitionRepository;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.service.AttachmentService;
import sa.sijill.api.web.dto.AssetAcquisitionDto;
import sa.sijill.api.web.dto.UpsertAssetAcquisitionRequest;

@Service
public class AssetAcquisitionService {
    private final AssetAcquisitionRepository repository;
    private final AssetRepository assets;
    private final AttachmentService attachments;
    private final AuditService audit;

    public AssetAcquisitionService(AssetAcquisitionRepository repository, AssetRepository assets,
            AttachmentService attachments, AuditService audit) {
        this.repository = repository;
        this.assets = assets;
        this.attachments = attachments;
        this.audit = audit;
    }

    public Page<AssetAcquisition> search(String q, UUID assetId, LocalDate from, LocalDate to, Pageable pageable) {
        return repository.search(q, assetId, from, to, pageable);
    }

    public AssetAcquisition get(UUID id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Acquisition record not found"));
    }

    @Transactional
    public AssetAcquisition create(UpsertAssetAcquisitionRequest request, Employee actor) {
        validate(request);
        if (repository.existsByDocumentNumber(request.documentNumber().trim())) {
            throw ApiException.conflict("Document number already exists");
        }
        AssetAcquisition acquisition = new AssetAcquisition();
        apply(acquisition, request);
        AssetAcquisition saved = repository.save(acquisition);
        audit.record(actor, "ASSET_ACQUISITION_CREATED", "AssetAcquisition", saved.getId());
        return saved;
    }

    @Transactional
    public AssetAcquisition update(UUID id, UpsertAssetAcquisitionRequest request, Employee actor) {
        validate(request);
        AssetAcquisition acquisition = get(id);
        if (request.version() == null || acquisition.getVersion() != request.version()) {
            throw new StaleVersionException(AssetAcquisitionDto.from(acquisition));
        }
        if (!acquisition.getDocumentNumber().equals(request.documentNumber().trim())
                && repository.existsByDocumentNumber(request.documentNumber().trim())) {
            throw ApiException.conflict("Document number already exists");
        }
        apply(acquisition, request);
        AssetAcquisition saved = repository.save(acquisition);
        audit.record(actor, "ASSET_ACQUISITION_UPDATED", "AssetAcquisition", saved.getId());
        return saved;
    }

    @Transactional
    public void delete(UUID id, Employee actor) {
        AssetAcquisition acquisition = get(id);
        attachments.list(AttachmentOwnerType.ASSET_ACQUISITION, id).stream().map(a -> a.getId()).toList()
                .forEach(attachments::delete);
        repository.delete(acquisition);
        audit.record(actor, "ASSET_ACQUISITION_DELETED", "AssetAcquisition", id);
    }

    private void validate(UpsertAssetAcquisitionRequest request) {
        if (request.documentNumber() == null || request.documentNumber().isBlank()) {
            throw ApiException.validation("Document number is required", Map.of("documentNumber", "must not be blank"));
        }
        if (request.amount() != null && request.amount().signum() < 0) {
            throw ApiException.validation("Amount cannot be negative", Map.of("amount", "must be zero or greater"));
        }
    }

    private void apply(AssetAcquisition acquisition, UpsertAssetAcquisitionRequest request) {
        acquisition.setDocumentNumber(request.documentNumber().trim());
        acquisition.setDocumentDate(request.documentDate() != null ? request.documentDate() : LocalDate.now());
        acquisition.setVendor(request.vendor());
        acquisition.setAmount(request.amount() != null ? request.amount() : BigDecimal.ZERO);
        acquisition.setNotes(request.notes());
        var selected = new LinkedHashSet<Asset>();
        for (UUID assetId : request.assetIds() != null ? request.assetIds() : java.util.List.<UUID>of()) {
            selected.add(assets.findById(assetId).orElseThrow(() ->
                    ApiException.validation("Asset not found", Map.of("assetIds", "contains an unknown asset"))));
        }
        acquisition.setAssets(selected);
    }
}
