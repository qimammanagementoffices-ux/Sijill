package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.security.JwtService;
import sa.sijill.api.service.AuthService;
import sa.sijill.api.service.EmployeeService;
import sa.sijill.api.web.dto.AuthResponse;
import sa.sijill.api.web.dto.EmployeeSummary;
import sa.sijill.api.web.dto.LoginRequest;
import sa.sijill.api.web.dto.UpdateEmployeeRequest;
import sa.sijill.api.web.dto.UpdateSelfRequest;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final EmployeeRepository employeeRepository;
    private final EmployeeService employeeService;

    public AuthController(
            AuthService authService,
            JwtService jwtService,
            EmployeeRepository employeeRepository,
            EmployeeService employeeService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.employeeRepository = employeeRepository;
        this.employeeService = employeeService;
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

    // Deliberately narrow -- jobTitle/departments/permissions stay untouched
    // (see UpdateSelfRequest), so this reuses EmployeeService.update() with
    // the actor's own current values spliced in for the fields this
    // endpoint doesn't expose.
    @PutMapping("/me")
    public EmployeeSummary updateSelf(@AuthenticationPrincipal Employee actor, @RequestBody UpdateSelfRequest request) {
        var fullRequest = new UpdateEmployeeRequest(
                request.name(),
                request.phone(),
                actor.getEmail(),
                actor.getNationalId(),
                actor.getJobTitle() == null ? null : actor.getJobTitle().getId(),
                actor.getDepartments().stream().map(Department::getId).toList(),
                actor.getVersion(),
                request.photoAttachmentId());
        Employee updated = employeeService.update(actor.getId(), fullRequest);
        return EmployeeSummary.from(updated);
    }
}
