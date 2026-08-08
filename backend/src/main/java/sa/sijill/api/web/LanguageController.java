package sa.sijill.api.web;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.LanguageService;
import sa.sijill.api.web.dto.CreateLanguageRequest;
import sa.sijill.api.web.dto.LanguageDto;
import sa.sijill.api.web.dto.TranslationExtraValueDto;
import sa.sijill.api.web.dto.UpdateTranslationExtraValueRequest;

// Reuses sys.translations (same permission as /admin/translations) rather
// than a new key — managing which languages exist is the same capability
// as managing the strings themselves, just a level up.
@RestController
@RequestMapping("/api/v1/i18n/languages")
@PreAuthorize("hasAuthority('sys.translations')")
public class LanguageController {

    private final LanguageService languageService;

    public LanguageController(LanguageService languageService) {
        this.languageService = languageService;
    }

    @GetMapping
    public List<LanguageDto> list() {
        return languageService.list().stream().map(LanguageDto::from).toList();
    }

    // Synchronous: translates every existing key via the AI provider before
    // returning, which can take up to ~2 minutes for ~150 keys (see
    // AnthropicTranslationAiClient) — no background job infrastructure
    // exists in this app to make this async, and it's a rare admin action,
    // not a hot path.
    @PostMapping
    public LanguageDto create(@RequestBody CreateLanguageRequest request) {
        return LanguageDto.from(languageService.create(request));
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> delete(@PathVariable String code) {
        languageService.delete(code);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{code}/values")
    public List<TranslationExtraValueDto> values(@PathVariable String code) {
        return languageService.values(code).stream().map(TranslationExtraValueDto::from).toList();
    }

    @PutMapping("/{code}/values/{key}")
    public TranslationExtraValueDto updateValue(
            @PathVariable String code, @PathVariable String key, @RequestBody UpdateTranslationExtraValueRequest request) {
        return TranslationExtraValueDto.from(languageService.updateValue(code, key, request.value()));
    }
}
