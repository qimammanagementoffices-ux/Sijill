package sa.sijill.api.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.service.CategoryService;
import sa.sijill.api.web.dto.TranslateCategoryNameRequest;
import sa.sijill.api.web.dto.TranslateCategoryNameResponse;

// Shared by the warehouse/maintenance/asset categories popups -- gated on
// whichever of the two permissions that manage any category domain (both
// warehouse and maintenance categories use wh.items; assets use as.manage).
@RestController
@RequestMapping("/api/v1/categories/translate")
@PreAuthorize("hasAnyAuthority('wh.items', 'as.manage')")
public class CategoryTranslateController {

    private final CategoryService categoryService;

    public CategoryTranslateController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public TranslateCategoryNameResponse translate(@RequestBody TranslateCategoryNameRequest request) {
        return categoryService.translate(request);
    }
}
