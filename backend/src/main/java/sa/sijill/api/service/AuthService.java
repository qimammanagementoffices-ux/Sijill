package sa.sijill.api.service;

import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.security.JwtService;
import sa.sijill.api.security.LoginRateLimiter;
import sa.sijill.api.web.dto.LoginRequest;

@Service
public class AuthService {

    // Deliberately identical for "no such phone" and "wrong PIN" — never
    // reveal which part was wrong (docs/api-conventions.md).
    private static final String GENERIC_LOGIN_FAILURE = "Invalid phone number or PIN";

    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhoneNormalizer phoneNormalizer;
    private final JwtService jwtService;
    private final LoginRateLimiter rateLimiter;

    public AuthService(
            EmployeeRepository employeeRepository,
            PasswordEncoder passwordEncoder,
            PhoneNormalizer phoneNormalizer,
            JwtService jwtService,
            LoginRateLimiter rateLimiter) {
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.phoneNormalizer = phoneNormalizer;
        this.jwtService = jwtService;
        this.rateLimiter = rateLimiter;
    }

    public String login(LoginRequest request) {
        String phone = phoneNormalizer.normalize(request.phone());

        if (!rateLimiter.tryAcquire(phone)) {
            throw ApiException.rateLimited("Too many login attempts. Try again later.");
        }

        Optional<Employee> employee = employeeRepository.findByPhone(phone);
        boolean valid =
                employee.isPresent()
                        && employee.get().isActive()
                        && request.pin() != null
                        && passwordEncoder.matches(request.pin(), employee.get().getPinHash());

        if (!valid) {
            throw ApiException.unauthenticated(GENERIC_LOGIN_FAILURE);
        }

        return jwtService.issueAccessToken(employee.get().getId());
    }
}
