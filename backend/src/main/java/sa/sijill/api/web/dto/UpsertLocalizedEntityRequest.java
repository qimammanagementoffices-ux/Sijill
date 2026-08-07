package sa.sijill.api.web.dto;

// version is null on create, required on update.
public record UpsertLocalizedEntityRequest(String nameAr, String nameEn, Integer version) {}
