package sa.sijill.api.web.dto;

import sa.sijill.api.domain.TranslationExtraValue;

public record TranslationExtraValueDto(String key, String value) {

    public static TranslationExtraValueDto from(TranslationExtraValue entity) {
        return new TranslationExtraValueDto(entity.getTranslationKey(), entity.getValue());
    }
}
