package sa.sijill.api.web.dto;

import sa.sijill.api.domain.Translation;

public record TranslationDto(String key, String valueAr, String valueEn, String valueHi, int version) {

    public static TranslationDto from(Translation translation) {
        return new TranslationDto(
                translation.getKey(),
                translation.getValueAr(),
                translation.getValueEn(),
                translation.getValueHi(),
                translation.getVersion());
    }
}
