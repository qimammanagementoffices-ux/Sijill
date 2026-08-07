package sa.sijill.api.web;

import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Translation;
import sa.sijill.api.service.TranslationService;
import sa.sijill.api.web.dto.PagedResponse;
import sa.sijill.api.web.dto.TranslationDto;
import sa.sijill.api.web.dto.UpdateTranslationRequest;

@RestController
@RequestMapping("/api/v1/i18n")
public class TranslationController {

    private final TranslationService translationService;

    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    // Public: onboarding/login render before authentication exists.
    @GetMapping("/dictionary")
    public Map<String, String> dictionary(@RequestParam String locale) {
        return translationService.getDictionary(locale);
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
