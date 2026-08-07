package sa.sijill.api.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.BrandingService;
import sa.sijill.api.web.dto.BrandingDto;
import sa.sijill.api.web.dto.UpdateBrandingRequest;

@RestController
@RequestMapping("/api/v1/branding")
public class BrandingController {

    private final BrandingService brandingService;

    public BrandingController(BrandingService brandingService) {
        this.brandingService = brandingService;
    }

    // Public — the login/onboarding pages need branding before any auth exists.
    @GetMapping
    public BrandingDto get() {
        return BrandingDto.from(brandingService.get());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('sys.branding')")
    public BrandingDto update(@RequestBody UpdateBrandingRequest request) {
        return BrandingDto.from(brandingService.update(request));
    }

    @PostMapping("/reset")
    @PreAuthorize("hasAuthority('sys.branding')")
    public BrandingDto reset() {
        return BrandingDto.from(brandingService.reset());
    }
}
