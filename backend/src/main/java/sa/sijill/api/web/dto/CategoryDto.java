package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Category;

public record CategoryDto(UUID id, String nameAr, String nameEn, boolean active, int version) {

    public static CategoryDto from(Category category) {
        return new CategoryDto(
                category.getId(), category.getNameAr(), category.getNameEn(), category.isActive(), category.getVersion());
    }
}
