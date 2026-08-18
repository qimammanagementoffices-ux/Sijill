package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.web.dto.CreateEmployeeRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.LoginRequest;

@Transactional
class AuditLogAccessTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void auditLogRequiresItsDedicatedPermission() throws Exception {
        String adminBody = mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new FirstAdminRequest("Admin", "0581000001", "1234", "1234"))))
                .andReturn().getResponse().getContentAsString();
        String adminToken = objectMapper.readTree(adminBody).get("token").asText();

        var employee = new CreateEmployeeRequest(
                "Employee", "0581000002", "1234", "1234", null, null, null, null, null, Set.of(), null);
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(employee)));
        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0581000002", "1234"))))
                .andReturn().getResponse().getContentAsString();
        String employeeToken = objectMapper.readTree(loginBody).get("token").asText();

        mockMvc.perform(get("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}
