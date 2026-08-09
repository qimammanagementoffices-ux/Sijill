package sa.sijill.api.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.CategoryRepository;
import sa.sijill.api.web.dto.CategoryDto;
import sa.sijill.api.web.dto.TranslateCategoryNameRequest;
import sa.sijill.api.web.dto.TranslateCategoryNameResponse;
import sa.sijill.api.web.dto.UpsertCategoryRequest;

// No hard delete — same reference-data caution as StructureService
// (Department/JobTitle); categories are soft-removed via deactivate().
@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final TranslationAiClient translationAiClient;

    public CategoryService(CategoryRepository categoryRepository, TranslationAiClient translationAiClient) {
        this.categoryRepository = categoryRepository;
        this.translationAiClient = translationAiClient;
    }

    public List<Category> list(Domain domain) {
        return categoryRepository.findByDomainAndActiveTrue(domain);
    }

    @Transactional
    public Category create(Domain domain, UpsertCategoryRequest request) {
        validate(request);
        Category category = new Category();
        category.setDomain(domain);
        category.setNameAr(request.nameAr());
        category.setNameEn(request.nameEn());
        category.setNameUr(request.nameUr());
        category.setIcon(request.icon());
        return categoryRepository.save(category);
    }

    @Transactional
    public Category update(UUID id, UpsertCategoryRequest request) {
        validate(request);
        Category category = categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("Category not found"));
        if (request.version() == null || !request.version().equals(category.getVersion())) {
            throw new StaleVersionException(CategoryDto.from(category));
        }
        category.setNameAr(request.nameAr());
        category.setNameEn(request.nameEn());
        category.setNameUr(request.nameUr());
        category.setIcon(request.icon());
        return categoryRepository.save(category);
    }

    @Transactional
    public void deactivate(UUID id) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("Category not found"));
        category.setActive(false);
        categoryRepository.save(category);
    }

    public TranslateCategoryNameResponse translate(TranslateCategoryNameRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            throw ApiException.validation("Text is required", Map.of("text", "must not be blank"));
        }
        String ar = request.text();
        String en = request.text();
        String ur = request.text();
        switch (request.sourceLang()) {
            case "ar" -> {
                en = translationAiClient.translateText(request.text(), "Arabic", "English");
                ur = translationAiClient.translateText(request.text(), "Arabic", "Urdu");
            }
            case "en" -> {
                ar = translationAiClient.translateText(request.text(), "English", "Arabic");
                ur = translationAiClient.translateText(request.text(), "English", "Urdu");
            }
            case "ur" -> {
                ar = translationAiClient.translateText(request.text(), "Urdu", "Arabic");
                en = translationAiClient.translateText(request.text(), "Urdu", "English");
            }
            default -> throw ApiException.validation(
                    "Unsupported sourceLang '" + request.sourceLang() + "'", Map.of("sourceLang", "must be ar, en, or ur"));
        }
        return new TranslateCategoryNameResponse(ar, en, ur);
    }

    private void validate(UpsertCategoryRequest request) {
        if (request.nameAr() == null || request.nameAr().isBlank()) {
            throw ApiException.validation("Arabic name is required", Map.of("nameAr", "must not be blank"));
        }
        if (request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("English name is required", Map.of("nameEn", "must not be blank"));
        }
    }
}
