package sa.sijill.api.service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.repository.PermissionRepository;
import sa.sijill.api.web.dto.FirstAdminRequest;

@Service
public class OnboardingService {

    private final EmployeeRepository employeeRepository;
    private final PermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhoneNormalizer phoneNormalizer;
    private final PinValidator pinValidator;
    private final AuditService auditService;

    public OnboardingService(
            EmployeeRepository employeeRepository,
            PermissionRepository permissionRepository,
            PasswordEncoder passwordEncoder,
            PhoneNormalizer phoneNormalizer,
            PinValidator pinValidator,
            AuditService auditService) {
        this.employeeRepository = employeeRepository;
        this.permissionRepository = permissionRepository;
        this.passwordEncoder = passwordEncoder;
        this.phoneNormalizer = phoneNormalizer;
        this.pinValidator = pinValidator;
        this.auditService = auditService;
    }

    public boolean needsOnboarding() {
        return employeeRepository.count() == 0;
    }

    @Transactional
    public Employee createFirstAdmin(FirstAdminRequest request) {
        if (!needsOnboarding()) {
            throw ApiException.conflict("An administrator account already exists");
        }

        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("name", "must not be blank"));
        }

        String phone = phoneNormalizer.normalize(request.phone());
        pinValidator.validate(request.pin(), request.pinConfirm());

        Employee employee = new Employee();
        employee.setEmployeeNumber(generateEmployeeNumber());
        employee.setName(request.name());
        employee.setPhone(phone);
        employee.setPinHash(passwordEncoder.encode(request.pin()));
        employee.setJoinedDate(LocalDate.now());
        employee.setActive(true);

        List<Permission> allPermissions = permissionRepository.findAll();
        Set<Permission> grantedPermissions = new HashSet<>(allPermissions);
        employee.setPermissions(grantedPermissions);

        Employee saved = employeeRepository.save(employee);
        auditService.record(saved, "FIRST_ADMIN_CREATED", "Employee", saved.getId());
        return saved;
    }

    private String generateEmployeeNumber() {
        long seq = employeeRepository.nextEmployeeNumberSequence();
        return "EMP-" + String.format("%05d", seq);
    }
}
