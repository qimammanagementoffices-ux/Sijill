package sa.sijill.api.web.dto;

// Deliberately its own DTO rather than reusing UpsertLocalizedEntityRequest
// -- that record is shared with StructureService (departments/job-titles),
// which do NOT get an icon or Urdu name field. version is null on create,
// required on update.
public record UpsertCategoryRequest(String nameAr, String nameEn, String nameHi, String icon, Integer version) {}
