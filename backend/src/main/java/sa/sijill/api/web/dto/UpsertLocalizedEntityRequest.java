package sa.sijill.api.web.dto;

import java.util.UUID;

// version is null on create, required on update.
public record UpsertLocalizedEntityRequest(String nameAr, String nameEn, Integer version, String nameHi, UUID parentId) {}
