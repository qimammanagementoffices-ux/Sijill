package sa.sijill.api.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.FaultType;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.CategoryRepository;
import sa.sijill.api.repository.FaultTypeRepository;
import sa.sijill.api.web.dto.FaultTypeDto;
import sa.sijill.api.web.dto.UpsertFaultTypeRequest;

// No delete — same reference-data caution as StructureService/CategoryService.
@Service
public class FaultTypeService {

    private final FaultTypeRepository faultTypeRepository;
    private final CategoryRepository categoryRepository;

    public FaultTypeService(FaultTypeRepository faultTypeRepository, CategoryRepository categoryRepository) {
        this.faultTypeRepository = faultTypeRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<FaultType> list() {
        return faultTypeRepository.findAll();
    }

    @Transactional
    public FaultType create(UpsertFaultTypeRequest request) {
        validate(request);
        FaultType faultType = new FaultType();
        faultType.setNameAr(request.nameAr());
        faultType.setNameEn(request.nameEn());
        faultType.setSuggestedCategory(resolveCategory(request.suggestedCategoryId()));
        return faultTypeRepository.save(faultType);
    }

    @Transactional
    public FaultType update(UUID id, UpsertFaultTypeRequest request) {
        validate(request);
        FaultType faultType =
                faultTypeRepository.findById(id).orElseThrow(() -> ApiException.notFound("Fault type not found"));
        if (request.version() == null || !request.version().equals(faultType.getVersion())) {
            throw new StaleVersionException(FaultTypeDto.from(faultType));
        }
        faultType.setNameAr(request.nameAr());
        faultType.setNameEn(request.nameEn());
        faultType.setSuggestedCategory(resolveCategory(request.suggestedCategoryId()));
        return faultTypeRepository.save(faultType);
    }

    private Category resolveCategory(UUID categoryId) {
        if (categoryId == null) return null;
        return categoryRepository.findById(categoryId).orElseThrow(() -> ApiException.validation(
                "Category not found", Map.of("suggestedCategoryId", "does not exist")));
    }

    private void validate(UpsertFaultTypeRequest request) {
        if (request.nameAr() == null || request.nameAr().isBlank()) {
            throw ApiException.validation("Arabic name is required", Map.of("nameAr", "must not be blank"));
        }
        if (request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("English name is required", Map.of("nameEn", "must not be blank"));
        }
    }
}
