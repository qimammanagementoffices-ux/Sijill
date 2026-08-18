package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

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
class DashboardAccessTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void dashboardStatsAreAvailableOnlyToAdministrators() throws Exception {
        String adminToken = createAdminAndGetToken();
        String employeeToken = createEmployeeAndLogin(adminToken);

        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void employeeAdministratorDoesNotReceiveUnrelatedModuleStatistics() throws Exception {
        String adminToken = createAdminAndGetToken();
        String employeeToken = createEmployeeAndLogin(adminToken, "0599888803", Set.of("emp.manage"));

        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.warehouse").isEmpty())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.maintenance").isEmpty())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.assets").isEmpty());
    }

    @Test
    void itemManagerDoesNotReceiveWarehouseRequestAggregate() throws Exception {
        String adminToken = createAdminAndGetToken();
        String employeeToken = createEmployeeAndLogin(
                adminToken, "0599888804", Set.of("emp.manage", "wh.items"));

        mockMvc.perform(get("/api/v1/dashboard/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + employeeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warehouse.itemCount").isNumber())
                .andExpect(jsonPath("$.warehouse.pendingRequestCount").isEmpty());
    }

    private String createAdminAndGetToken() throws Exception {
        String body = mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new FirstAdminRequest("Admin", "0599888801", "1234", "1234"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }

    private String createEmployeeAndLogin(String adminToken) throws Exception {
        return createEmployeeAndLogin(adminToken, "0599888802", Set.of("wh.view"));
    }

    private String createEmployeeAndLogin(String adminToken, String phone, Set<String> permissions) throws Exception {
        var request = new CreateEmployeeRequest(
                "Employee", phone, "1234", "1234", null, null, null, null, null, permissions, null);
        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(phone, "1234"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }
}
