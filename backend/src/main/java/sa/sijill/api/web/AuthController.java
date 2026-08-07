package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.security.JwtService;
import sa.sijill.api.service.AuthService;
import sa.sijill.api.web.dto.AuthResponse;
import sa.sijill.api.web.dto.EmployeeSummary;
import sa.sijill.api.web.dto.LoginRequest;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final EmployeeRepository employeeRepository;

    public AuthController(
            AuthService authService, JwtService jwtService, EmployeeRepository employeeRepository) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.employeeRepository = employeeRepository;
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        String token = authService.login(request);
        UUID employeeId = jwtService.parseEmployeeId(token).orElseThrow();
        Employee employee = employeeRepository.findById(employeeId).orElseThrow();
        return new AuthResponse(token, EmployeeSummary.from(employee));
    }

    @GetMapping("/me")
    public EmployeeSummary me(@AuthenticationPrincipal Employee employee) {
        return EmployeeSummary.from(employee);
    }
}
