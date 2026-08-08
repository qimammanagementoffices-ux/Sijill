package sa.sijill.api.web.dto;

import sa.sijill.api.domain.Language;

public record LanguageDto(String code, String name, String direction) {

    public static LanguageDto from(Language language) {
        return new LanguageDto(language.getCode(), language.getName(), language.getDirection());
    }
}
