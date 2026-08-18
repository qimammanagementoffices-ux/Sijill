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

@RestController
@RequestMapping("/api/v1/maintenance/categories")
public class MaintenanceCategoryController {

    private final CategoryService categoryService;

    public MaintenanceCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('mt.view', 'wh.items')")
    public List<CategoryDto> list() {
        return categoryService.list(Domain.MAINTENANCE).stream().map(CategoryDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.items')")
    public CategoryDto create(@RequestBody UpsertCategoryRequest request) {
        return CategoryDto.from(categoryService.create(Domain.MAINTENANCE, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('wh.items')")
    public CategoryDto update(@PathVariable UUID id, @RequestBody UpsertCategoryRequest request) {
        return CategoryDto.from(categoryService.update(id, request));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('wh.items')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        categoryService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
