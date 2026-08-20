package sa.sijill.api.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.LoginRequest;

// LoginRateLimiter is now backed by RateLimitStore (Postgres, via
// JdbcTemplate against the same DataSource as everything else) rather than
// an in-memory singleton -- its writes participate in this test's
// transaction like any other DB write, so @Transactional rollback now
// covers it too. No more @DirtiesContext / unique-phone-per-test workaround
// needed for cross-test leakage.
@Transactional
class AuthLoginTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private void createAdmin(String phone) throws Exception {
        var request = new FirstAdminRequest("Admin Name", phone, "482913", "482913");
        mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void correctCredentialsIssueToken() throws Exception {
        createAdmin("0511111111");
        var login = new LoginRequest("0511111111", "482913");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void wrongPinReturnsGenericUnauthenticated() throws Exception {
        createAdmin("0522222222");
        var login = new LoginRequest("0522222222", "0000");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.error.message").value("Invalid phone number or PIN"));
    }

    @Test
    void unknownPhoneReturnsSameGenericMessageAsWrongPin() throws Exception {
        var login = new LoginRequest("0533333333", "482913");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.message").value("Invalid phone number or PIN"));
    }

    @Test
    void rapidFailedAttemptsAreRateLimited() throws Exception {
        createAdmin("0544444444");
        var login = new LoginRequest("0544444444", "0000");
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(login)));
        }
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }

    @Test
    void aPinBelowPolicyIsFlaggedOnTheWayIn() throws Exception {
        createAdmin("0577777001");
        // Set a pre-policy PIN straight on the row: the validator refuses to
        // create one now, which is exactly the situation this covers -- an
        // account that predates the rule.
        Employee employee = employeeRepository.findByPhone("0577777001").orElseThrow();
        employee.setPinHash(passwordEncoder.encode("1234"));
        employee.setMustChangePin(false);
        employeeRepository.save(employee);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0577777001", "1234"))))
                .andExpect(status().isOk());

        assertThat(employeeRepository.findByPhone("0577777001").orElseThrow().isMustChangePin())
                .as("a weak PIN must be flagged for change at login")
                .isTrue();
    }
}
