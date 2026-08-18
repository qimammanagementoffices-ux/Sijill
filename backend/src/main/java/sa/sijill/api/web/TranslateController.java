package sa.sijill.api.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.service.NameTranslationService;
import sa.sijill.api.web.dto.TranslateNameRequest;
import sa.sijill.api.web.dto.TranslateNameResponse;

// Shared only by the catalogue/structure forms that can persist translated
// names. Gate the external service call with those same write permissions so
// an unrelated authenticated account cannot use this endpoint as an open
// translation proxy.
@RestController
@RequestMapping("/api/v1/translate")
public class TranslateController {

    private final NameTranslationService nameTranslationService;

    public TranslateController(NameTranslationService nameTranslationService) {
        this.nameTranslationService = nameTranslationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('as.manage', 'wh.items', 'emp.structure')")
    public TranslateNameResponse translate(@RequestBody TranslateNameRequest request) {
        return nameTranslationService.translate(request);
    }
}
