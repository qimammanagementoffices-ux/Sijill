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
import sa.sijill.api.web.dto.ChangeOwnPinRequest;
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
    private final PinValidator pinValidator;
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
            LoginRateLimiter rateLimiter,
            PinValidator pinValidator) {
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.phoneNormalizer = phoneNormalizer;
        this.jwtService = jwtService;
        this.rateLimiter = rateLimiter;
        this.pinValidator = pinValidator;
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

        // The one moment the plaintext exists: judge the stored PIN against the
        // current policy and flag it if it falls short. Login still succeeds --
        // locking people out over a PIN they were previously told was fine
        // would be its own outage -- but the app makes them change it.
        Employee found = employee.get();
        if (!pinValidator.meetsPolicy(pin) && !found.isMustChangePin()) {
            found.setMustChangePin(true);
            employeeRepository.save(found);
        }

        return jwtService.issueAccessToken(found.getId());
    }

    // For re-confirming a sensitive action against the already-authenticated
    // caller's own PIN (e.g. backup restore) — not a login, so no phone
    // lookup or rate limiting here; callers gate rate limiting themselves
    // since the limiter key/semantics differ per action.
    /**
     * Self-service PIN change. Proving the current PIN matters even though the
     * caller already holds a valid token: it stops a borrowed or stolen session
     * from locking the real owner out of their own account.
     */
    @org.springframework.transaction.annotation.Transactional
    public Employee changeOwnPin(Employee actor, ChangeOwnPinRequest request) {
        if (!verifyPin(actor, request.currentPin())) {
            throw ApiException.unauthenticated("Current PIN is incorrect");
        }
        pinValidator.validate(request.pin(), request.pinConfirm());
        if (verifyPin(actor, request.pin())) {
            throw ApiException.validation(
                    "New PIN must differ from the current one", java.util.Map.of("pin", "must be different"));
        }
        actor.setPinHash(passwordEncoder.encode(request.pin()));
        actor.setMustChangePin(false);
        return employeeRepository.save(actor);
    }

    public boolean verifyPin(Employee actor, String pin) {
        return pin != null && passwordEncoder.matches(pin, actor.getPinHash());
    }
}
