package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.service.CategoryService;
import sa.sijill.api.web.dto.CategoryDto;
import sa.sijill.api.web.dto.UpsertCategoryRequest;

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
    public CategoryDto create(@RequestBody UpsertCategoryRequest request) {
        return CategoryDto.from(categoryService.create(Domain.ASSET, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('as.manage')")
    public CategoryDto update(@PathVariable UUID id, @RequestBody UpsertCategoryRequest request) {
        return CategoryDto.from(categoryService.update(id, request));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('as.manage')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        categoryService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
