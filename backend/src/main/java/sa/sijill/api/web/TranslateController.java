package sa.sijill.api.web;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.service.NameTranslationService;
import sa.sijill.api.web.dto.TranslateNameRequest;
import sa.sijill.api.web.dto.TranslateNameResponse;

// No @PreAuthorize -- shared by every bilingual/trilingual name form across
// the app (each gated by its own domain's manage permission on the actual
// create/update call), and translation itself touches no protected data,
// just calls a free external translation service with user-supplied text.
// Default security rule (anyRequest().authenticated()) still applies.
@RestController
@RequestMapping("/api/v1/translate")
public class TranslateController {

    private final NameTranslationService nameTranslationService;

    public TranslateController(NameTranslationService nameTranslationService) {
        this.nameTranslationService = nameTranslationService;
    }

    @PostMapping
    public TranslateNameResponse translate(@RequestBody TranslateNameRequest request) {
        return nameTranslationService.translate(request);
    }
}
