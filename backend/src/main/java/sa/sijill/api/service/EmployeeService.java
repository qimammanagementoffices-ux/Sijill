package sa.sijill.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.JobTitle;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.repository.DepartmentRepository;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.repository.JobTitleRepository;
import sa.sijill.api.repository.PermissionRepository;
import sa.sijill.api.web.dto.CreateEmployeeRequest;
import sa.sijill.api.web.dto.EmployeeDetail;
import sa.sijill.api.web.dto.ResetPinRequest;
import sa.sijill.api.web.dto.UpdateEmployeeRequest;
import sa.sijill.api.web.dto.UpdatePermissionsRequest;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final JobTitleRepository jobTitleRepository;
    private final PermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhoneNormalizer phoneNormalizer;
    private final PinValidator pinValidator;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final AttachmentRepository attachmentRepository;
    private final AttachmentService attachmentService;

    public EmployeeService(
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            JobTitleRepository jobTitleRepository,
            PermissionRepository permissionRepository,
            PasswordEncoder passwordEncoder,
            PhoneNormalizer phoneNormalizer,
            PinValidator pinValidator,
            AuditService auditService,
            ObjectMapper objectMapper,
            AttachmentRepository attachmentRepository,
            AttachmentService attachmentService) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.jobTitleRepository = jobTitleRepository;
        this.permissionRepository = permissionRepository;
        this.passwordEncoder = passwordEncoder;
        this.phoneNormalizer = phoneNormalizer;
        this.pinValidator = pinValidator;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.attachmentRepository = attachmentRepository;
        this.attachmentService = attachmentService;
    }

    public Page<Employee> search(String q, UUID departmentId, Pageable pageable) {
        return employeeRepository.search(q, departmentId, pageable);
    }

    public Employee get(UUID id) {
        return employeeRepository.findById(id).orElseThrow(() -> ApiException.notFound("Employee not found"));
    }

    @Transactional
    public Employee create(CreateEmployeeRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("name", "must not be blank"));
        }

        String phone = phoneNormalizer.normalize(request.phone());
        if (employeeRepository.existsByPhone(phone)) {
            throw ApiException.validation(
                    "Phone number already in use", Map.of("phone", "already in use by another employee"));
        }
        pinValidator.validate(request.pin(), request.pinConfirm());

        Employee employee = new Employee();
        employee.setEmployeeNumber("EMP-" + String.format("%05d", employeeRepository.nextEmployeeNumberSequence()));
        employee.setName(request.name());
        employee.setPhone(phone);
        employee.setPinHash(passwordEncoder.encode(request.pin()));
        employee.setEmail(request.email());
        employee.setNationalId(request.nationalId());
        employee.setJoinedDate(request.joinedDate() != null ? request.joinedDate() : java.time.LocalDate.now());
        employee.setActive(true);
        employee.setJobTitle(resolveJobTitle(request.jobTitleId()));
        employee.setDepartments(resolveDepartments(request.departmentIds()));
        employee.setPermissions(resolvePermissions(request.permissionKeys()));
        employee.setPhotoAttachment(resolveAttachment(request.photoAttachmentId()));

        Employee saved = employeeRepository.save(employee);
        auditService.record(saved, "EMPLOYEE_CREATED", "Employee", saved.getId());
        return saved;
    }

    @Transactional
    public Employee update(UUID id, UpdateEmployeeRequest request) {
        Employee employee = get(id);
        if (employee.getVersion() != request.version()) {
            throw new StaleVersionException(EmployeeDetail.from(employee));
        }

        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.validation("Name is required", Map.of("name", "must not be blank"));
        }

        String phone = phoneNormalizer.normalize(request.phone());
        if (!phone.equals(employee.getPhone()) && employeeRepository.existsByPhone(phone)) {
            throw ApiException.validation(
                    "Phone number already in use", Map.of("phone", "already in use by another employee"));
        }

        UUID previousPhotoId = employee.getPhotoAttachment() == null ? null : employee.getPhotoAttachment().getId();

        employee.setName(request.name());
        employee.setPhone(phone);
        employee.setEmail(request.email());
        employee.setNationalId(request.nationalId());
        employee.setJobTitle(resolveJobTitle(request.jobTitleId()));
        employee.setDepartments(resolveDepartments(request.departmentIds()));
        employee.setPhotoAttachment(resolveAttachment(request.photoAttachmentId()));

        Employee saved = employeeRepository.save(employee);
        auditService.record(saved, "EMPLOYEE_UPDATED", "Employee", saved.getId());

        // Clear the old photo from storage once nothing references it, same
        // as BrandingService's logo replacement.
        if (previousPhotoId != null && !previousPhotoId.equals(request.photoAttachmentId())) {
            attachmentService.delete(previousPhotoId);
        }
        return saved;
    }

    @Transactional
    public void deactivate(UUID id) {
        Employee employee = get(id);
        employee.setActive(false);
        employeeRepository.save(employee);
        auditService.record(employee, "EMPLOYEE_DEACTIVATED", "Employee", employee.getId());
    }

    @Transactional
    public void reactivate(UUID id) {
        Employee employee = get(id);
        employee.setActive(true);
        employeeRepository.save(employee);
        auditService.record(employee, "EMPLOYEE_REACTIVATED", "Employee", employee.getId());
    }

    @Transactional
    public Employee updatePermissions(UUID id, UpdatePermissionsRequest request) {
        Employee employee = get(id);
        if (employee.getVersion() != request.version()) {
            throw new StaleVersionException(EmployeeDetail.from(employee));
        }

        String before = toJsonArray(employee.getPermissions().stream().map(Permission::getKey).sorted().toList());
        employee.setPermissions(resolvePermissions(request.permissionKeys()));
        Employee saved = employeeRepository.save(employee);
        String after = toJsonArray(saved.getPermissions().stream().map(Permission::getKey).sorted().toList());

        auditService.record(saved, "EMPLOYEE_PERMISSIONS_CHANGED", "Employee", saved.getId(), before, after);
        return saved;
    }

    @Transactional
    public void resetPin(UUID id, ResetPinRequest request) {
        Employee employee = get(id);
        pinValidator.validate(request.pin(), request.pinConfirm());
        employee.setPinHash(passwordEncoder.encode(request.pin()));
        employeeRepository.save(employee);
        // No before/after state logged here — PIN material never belongs in the audit trail.
        auditService.record(employee, "EMPLOYEE_PIN_RESET", "Employee", employee.getId());
    }

    private JobTitle resolveJobTitle(UUID jobTitleId) {
        if (jobTitleId == null) return null;
        return jobTitleRepository.findById(jobTitleId).orElseThrow(() -> ApiException.validation(
                "Job title not found", Map.of("jobTitleId", "does not exist")));
    }

    private Attachment resolveAttachment(UUID photoAttachmentId) {
        if (photoAttachmentId == null) return null;
        return attachmentRepository.findById(photoAttachmentId).orElseThrow(() -> ApiException.validation(
                "Photo attachment not found", Map.of("photoAttachmentId", "does not exist")));
    }

    private Set<Department> resolveDepartments(List<UUID> departmentIds) {
        if (departmentIds == null || departmentIds.isEmpty()) return new HashSet<>();
        List<Department> found = departmentRepository.findAllById(departmentIds);
        if (found.size() != departmentIds.size()) {
            throw ApiException.validation(
                    "One or more departments not found", Map.of("departmentIds", "contains an unknown id"));
        }
        List<Department> roots = found.stream().filter(department -> department.getParent() == null).toList();
        if (roots.size() != 1) {
            throw ApiException.validation(
                    "Exactly one administration is required",
                    Map.of("departmentIds", "must contain exactly one top-level department"));
        }
        UUID rootId = roots.getFirst().getId();
        if (found.stream().anyMatch(department -> !belongsToRoot(department, rootId))) {
            throw ApiException.validation(
                    "All selected departments must belong to the chosen administration",
                    Map.of("departmentIds", "contains a department outside the selected administration"));
        }
        return new HashSet<>(found);
    }

    private boolean belongsToRoot(Department department, UUID rootId) {
        Department current = department;
        Set<UUID> visited = new HashSet<>();
        while (current.getParent() != null) {
            if (!visited.add(current.getId())) return false;
            current = current.getParent();
        }
        return current.getId().equals(rootId);
    }

    private String toJsonArray(List<String> keys) {
        try {
            return objectMapper.writeValueAsString(keys);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private Set<Permission> resolvePermissions(Set<String> permissionKeys) {
        if (permissionKeys == null || permissionKeys.isEmpty()) return new HashSet<>();
        List<Permission> found = permissionRepository.findAllById(permissionKeys);
        if (found.size() != permissionKeys.size()) {
            throw ApiException.validation(
                    "One or more permission keys not found", Map.of("permissionKeys", "contains an unknown key"));
        }
        return new HashSet<>(found);
    }
}
