package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.AuditLogRepository;
import sa.sijill.api.web.dto.CreateEmployeeRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.UpdatePermissionsRequest;

@Transactional
class AuditLogTest extends AbstractIntegrationTest {

    @Autowired private OnboardingService onboardingService;
    @Autowired private EmployeeService employeeService;
    @Autowired private AuditLogRepository auditLogRepository;

    @Test
    void firstAdminCreationWritesAuditEntryInSameTransaction() {
        Employee employee = onboardingService.createFirstAdmin(
                new FirstAdminRequest("Admin Name", "0566667777", "1234", "1234"));

        var entries = auditLogRepository.findByEntityTypeAndEntityId("Employee", employee.getId());

        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getAction()).isEqualTo("FIRST_ADMIN_CREATED");
        assertThat(entries.get(0).getActor().getId()).isEqualTo(employee.getId());
    }

    @Test
    void permissionChangeWritesAuditEntryWithBeforeAndAfter() {
        Employee target = employeeService.create(new CreateEmployeeRequest(
                "Perm Target", "0588889999", "1234", "1234", null, null, null, null, null, Set.of("emp.view"), null));

        employeeService.updatePermissions(
                target.getId(), new UpdatePermissionsRequest(Set.of("emp.view", "emp.manage"), target.getVersion()));

        var entries = auditLogRepository.findByEntityTypeAndEntityId("Employee", target.getId());
        var permissionChange = entries.stream()
                .filter(e -> e.getAction().equals("EMPLOYEE_PERMISSIONS_CHANGED"))
                .findFirst()
                .orElseThrow();

        assertThat(permissionChange.getBeforeState()).contains("emp.view");
        assertThat(permissionChange.getAfterState()).contains("emp.manage");
    }
}
