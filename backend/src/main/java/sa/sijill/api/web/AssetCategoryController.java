package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.service.CategoryService;
import sa.sijill.api.web.dto.CategoryDto;
import sa.sijill.api.web.dto.UpsertLocalizedEntityRequest;

// Thin wrapper activating Domain.ASSET on the same reusable CategoryService
// warehouse/maintenance categories use — master spec §7.
@RestController
@RequestMapping("/api/v1/assets/categories")
public class AssetCategoryController {

    private final CategoryService categoryService;

    public AssetCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public List<CategoryDto> list() {
        return categoryService.list(Domain.ASSET).stream().map(CategoryDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('as.manage')")
    public CategoryDto create(@RequestBody UpsertLocalizedEntityRequest request) {
        return CategoryDto.from(categoryService.create(Domain.ASSET, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('as.manage')")
    public CategoryDto update(@PathVariable UUID id, @RequestBody UpsertLocalizedEntityRequest request) {
        return CategoryDto.from(categoryService.update(id, request));
    }
}
