package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.AuditLogRepository;
import sa.sijill.api.web.dto.FirstAdminRequest;

@Transactional
class AuditLogTest extends AbstractIntegrationTest {

    @Autowired private OnboardingService onboardingService;
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
}
