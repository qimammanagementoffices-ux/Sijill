package sa.sijill.api.web.dto;

import java.util.UUID;

public record UpsertFaultTypeRequest(String nameAr, String nameEn, UUID suggestedCategoryId, Integer version) {}
