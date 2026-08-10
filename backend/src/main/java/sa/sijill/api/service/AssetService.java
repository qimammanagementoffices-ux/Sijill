package sa.sijill.api.service;

import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetStatus;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Room;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.CategoryRepository;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.repository.RoomRepository;
import sa.sijill.api.web.dto.AssetDetail;
import sa.sijill.api.web.dto.CreateAssetRequest;
import sa.sijill.api.web.dto.UpdateAssetRequest;

@Service
public class AssetService {

    private final AssetRepository assetRepository;
    private final CategoryRepository categoryRepository;
    private final RoomRepository roomRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditService auditService;

    public AssetService(
            AssetRepository assetRepository,
            CategoryRepository categoryRepository,
            RoomRepository roomRepository,
            EmployeeRepository employeeRepository,
            AuditService auditService) {
        this.assetRepository = assetRepository;
        this.categoryRepository = categoryRepository;
        this.roomRepository = roomRepository;
        this.employeeRepository = employeeRepository;
        this.auditService = auditService;
    }

    public Page<Asset> search(String q, AssetStatus status, UUID roomId, Pageable pageable) {
        return assetRepository.search(q, status, roomId, pageable);
    }

    public Asset get(UUID id) {
        return assetRepository.findById(id).orElseThrow(() -> ApiException.notFound("Asset not found"));
    }

    public Asset getByPublicToken(UUID publicToken) {
        return assetRepository
                .findByPublicToken(publicToken)
                .orElseThrow(() -> ApiException.notFound("Asset not found"));
    }

    @Transactional
    public Asset create(CreateAssetRequest request, Employee actor) {
        if (request.assetNumber() == null || request.assetNumber().isBlank()) {
            throw ApiException.validation("Asset number is required", Map.of("assetNumber", "must not be blank"));
        }
        if (request.nameAr() == null || request.nameAr().isBlank() || request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("nameAr", "must not be blank"));
        }
        if (assetRepository.existsByAssetNumber(request.assetNumber())) {
            throw ApiException.validation("Asset number already in use", Map.of("assetNumber", "already in use"));
        }

        Asset asset = new Asset();
        asset.setAssetNumber(request.assetNumber());
        asset.setNameAr(request.nameAr());
        asset.setNameEn(request.nameEn());
        asset.setNameUr(request.nameUr());
        asset.setCategory(resolveCategory(request.categoryId()));
        asset.setRoom(resolveRoom(request.roomId()));
        asset.setCustodian(resolveEmployee(request.custodianId()));
        asset.setStatus(request.status() != null ? request.status() : AssetStatus.ACTIVE);
        asset.setAcquisitionDate(request.acquisitionDate());
        asset.setAcquisitionCost(request.acquisitionCost());
        asset.setVendor(request.vendor());
        asset.setNotes(request.notes());

        Asset saved = assetRepository.save(asset);
        auditService.record(actor, "ASSET_CREATED", "Asset", saved.getId());
        return saved;
    }

    @Transactional
    public Asset update(UUID id, UpdateAssetRequest request, Employee actor) {
        Asset asset = get(id);
        if (asset.getVersion() != request.version()) {
            throw new StaleVersionException(AssetDetail.from(asset));
        }
        if (request.nameAr() == null || request.nameAr().isBlank() || request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("nameAr", "must not be blank"));
        }

        asset.setNameAr(request.nameAr());
        asset.setNameEn(request.nameEn());
        asset.setNameUr(request.nameUr());
        asset.setCategory(resolveCategory(request.categoryId()));
        asset.setStatus(request.status() != null ? request.status() : asset.getStatus());
        asset.setAcquisitionDate(request.acquisitionDate());
        asset.setAcquisitionCost(request.acquisitionCost());
        asset.setVendor(request.vendor());
        asset.setNotes(request.notes());

        Asset saved = assetRepository.save(asset);
        auditService.record(actor, "ASSET_UPDATED", "Asset", saved.getId());
        return saved;
    }

    private Category resolveCategory(UUID categoryId) {
        if (categoryId == null) return null;
        return categoryRepository.findById(categoryId).orElseThrow(() -> ApiException.validation(
                "Category not found", Map.of("categoryId", "does not exist")));
    }

    private Room resolveRoom(UUID roomId) {
        if (roomId == null) return null;
        return roomRepository.findById(roomId).orElseThrow(() -> ApiException.validation(
                "Room not found", Map.of("roomId", "does not exist")));
    }

    private Employee resolveEmployee(UUID employeeId) {
        if (employeeId == null) return null;
        return employeeRepository.findById(employeeId).orElseThrow(() -> ApiException.validation(
                "Employee not found", Map.of("custodianId", "does not exist")));
    }
}
