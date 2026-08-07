package sa.sijill.api.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.service.OnboardingService;
import sa.sijill.api.web.dto.SystemStatusResponse;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    private final OnboardingService onboardingService;

    public SystemController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @GetMapping("/status")
    public SystemStatusResponse status() {
        return new SystemStatusResponse(onboardingService.needsOnboarding());
    }
}
