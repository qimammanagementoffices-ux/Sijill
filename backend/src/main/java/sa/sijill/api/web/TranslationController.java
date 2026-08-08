package sa.sijill.api.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Language;
import sa.sijill.api.domain.Translation;
import sa.sijill.api.repository.LanguageRepository;
import sa.sijill.api.service.TranslationService;
import sa.sijill.api.web.dto.LocaleDto;
import sa.sijill.api.web.dto.PagedResponse;
import sa.sijill.api.web.dto.TranslationDto;
import sa.sijill.api.web.dto.UpdateTranslationRequest;

@RestController
@RequestMapping("/api/v1/i18n")
public class TranslationController {

    // Display names for the three built-in locales -- these aren't stored
    // anywhere (Translation's ar/en/hi columns have no "what do I call this
    // language" field of their own), unlike admin-added Language rows which
    // carry their own `name`.
    private static final Map<String, String> BUILT_IN_LOCALE_NAMES =
            Map.of("ar", "العربية", "en", "English", "hi", "हिन्दी");
    private static final Map<String, String> BUILT_IN_LOCALE_DIRECTIONS =
            Map.of("ar", "rtl", "en", "ltr", "hi", "ltr");

    private final TranslationService translationService;
    private final LanguageRepository languageRepository;

    public TranslationController(TranslationService translationService, LanguageRepository languageRepository) {
        this.translationService = translationService;
        this.languageRepository = languageRepository;
    }

    // Public: onboarding/login render before authentication exists.
    @GetMapping("/dictionary")
    public Map<String, String> dictionary(@RequestParam String locale) {
        return translationService.getDictionary(locale);
    }

    // Public, for the frontend's language switcher -- every visitor needs
    // this before picking a locale, not just admins (unlike
    // GET /i18n/languages, which is the admin management list and requires
    // sys.translations).
    @GetMapping("/locales")
    public List<LocaleDto> locales() {
        Map<String, LocaleDto> byCode = new LinkedHashMap<>();
        for (String code : List.of("ar", "en", "hi")) {
            byCode.put(code, new LocaleDto(code, BUILT_IN_LOCALE_NAMES.get(code), BUILT_IN_LOCALE_DIRECTIONS.get(code)));
        }
        for (Language language : languageRepository.findAll()) {
            byCode.put(language.getCode(), new LocaleDto(language.getCode(), language.getName(), language.getDirection()));
        }
        return List.copyOf(byCode.values());
    }

    @GetMapping("/translations")
    @PreAuthorize("hasAuthority('sys.translations')")
    public PagedResponse<TranslationDto> search(
            @RequestParam(required = false) String q, @PageableDefault(size = 20, sort = "key") Pageable pageable) {
        Page<Translation> page = translationService.search(q, pageable);
        return PagedResponse.from(page, TranslationDto::from);
    }

    @PutMapping("/translations/{key}")
    @PreAuthorize("hasAuthority('sys.translations')")
    public TranslationDto update(@PathVariable String key, @RequestBody UpdateTranslationRequest request) {
        return TranslationDto.from(translationService.update(key, request));
    }
}
