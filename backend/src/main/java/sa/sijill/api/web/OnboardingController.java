package sa.sijill.api.web;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.security.JwtService;
import sa.sijill.api.service.OnboardingService;
import sa.sijill.api.web.dto.AuthResponse;
import sa.sijill.api.web.dto.EmployeeSummary;
import sa.sijill.api.web.dto.FirstAdminRequest;

@RestController
@RequestMapping("/api/v1/onboarding")
public class OnboardingController {

    private final OnboardingService onboardingService;
    private final JwtService jwtService;

    public OnboardingController(OnboardingService onboardingService, JwtService jwtService) {
        this.onboardingService = onboardingService;
        this.jwtService = jwtService;
    }

    // Creating the first admin also logs them in — no reason to make them
    // immediately re-enter the PIN they just chose.
    @PostMapping("/first-admin")
    public AuthResponse createFirstAdmin(@RequestBody FirstAdminRequest request) {
        Employee employee = onboardingService.createFirstAdmin(request);
        String token = jwtService.issueAccessToken(employee.getId());
        return new AuthResponse(token, EmployeeSummary.from(employee));
    }
}
