package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.JobTitle;

// Flat nameAr/nameEn/nameHi (not the nested {ar,en} shape used elsewhere) so
// this matches UpsertLocalizedEntityRequest field-for-field on admin CRUD
// forms.
public record LocalizedEntityDto(UUID id, String nameAr, String nameEn, String nameHi, int version) {

    public static LocalizedEntityDto from(Department department) {
        return new LocalizedEntityDto(
                department.getId(),
                department.getNameAr(),
                department.getNameEn(),
                department.getNameHi(),
                department.getVersion());
    }

    public static LocalizedEntityDto from(JobTitle jobTitle) {
        return new LocalizedEntityDto(
                jobTitle.getId(), jobTitle.getNameAr(), jobTitle.getNameEn(), jobTitle.getNameHi(), jobTitle.getVersion());
    }
}
