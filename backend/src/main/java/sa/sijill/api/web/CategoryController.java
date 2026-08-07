package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.service.CategoryService;
import sa.sijill.api.web.dto.CategoryDto;
import sa.sijill.api.web.dto.UpsertLocalizedEntityRequest;

@RestController
@RequestMapping("/api/v1/warehouse/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('wh.view')")
    public List<CategoryDto> list() {
        return categoryService.list(Domain.WAREHOUSE).stream().map(CategoryDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.items')")
    public CategoryDto create(@RequestBody UpsertLocalizedEntityRequest request) {
        return CategoryDto.from(categoryService.create(Domain.WAREHOUSE, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('wh.items')")
    public CategoryDto update(@PathVariable UUID id, @RequestBody UpsertLocalizedEntityRequest request) {
        return CategoryDto.from(categoryService.update(id, request));
    }
}
