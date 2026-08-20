package sa.sijill.api.service;

import java.util.Optional;
import java.util.UUID;
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
    // A throwaway hash to verify against when the phone matches nobody, so an
    // unknown phone costs the same BCrypt round as a wrong PIN. Without it the
    // no-such-employee path skips hashing and returns in a fraction of the
    // time, which tells an attacker which phone numbers are staff.
    private final String absentEmployeeHash;

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
        this.absentEmployeeHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    public String login(LoginRequest request) {
        String phone = phoneNormalizer.normalize(request.phone());

        if (!rateLimiter.tryAcquire(phone)) {
            throw ApiException.rateLimited("Too many login attempts. Try again later.");
        }

        Optional<Employee> employee = employeeRepository.findByPhone(phone);
        String pin = request.pin() == null ? "" : request.pin();
        // Always hash, even with nobody to compare against -- see
        // absentEmployeeHash. The result of the decoy round is discarded.
        String hashToCheck = employee.map(Employee::getPinHash).orElse(absentEmployeeHash);
        boolean pinMatches = passwordEncoder.matches(pin, hashToCheck);
        boolean valid = employee.isPresent() && employee.get().isActive() && request.pin() != null && pinMatches;

        if (!valid) {
            throw ApiException.unauthenticated(GENERIC_LOGIN_FAILURE);
        }

        return jwtService.issueAccessToken(employee.get().getId());
    }

    // For re-confirming a sensitive action against the already-authenticated
    // caller's own PIN (e.g. backup restore) — not a login, so no phone
    // lookup or rate limiting here; callers gate rate limiting themselves
    // since the limiter key/semantics differ per action.
    public boolean verifyPin(Employee actor, String pin) {
        return pin != null && passwordEncoder.matches(pin, actor.getPinHash());
    }
}
