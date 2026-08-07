package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.web.dto.FirstAdminRequest;

@Transactional
class AuthControllerMeTest extends AbstractIntegrationTest {

    private static final String PHONE = "0577778888";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private EmployeeRepository employeeRepository;

    @Test
    void meRejectsMissingOrGarbageToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meReflectsCurrentPermissionsNotTokenSnapshot() throws Exception {
        var request = new FirstAdminRequest("Admin Name", PHONE, "1234", "1234");
        String body = mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        String token = json.get("token").asText();

        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions", org.hamcrest.Matchers.hasItem("emp.manage")));

        // Revoke every permission directly in the DB, without issuing a new token.
        var employee = employeeRepository.findByPhone(PHONE).orElseThrow();
        employee.setPermissions(new java.util.HashSet<Permission>());
        employeeRepository.save(employee);

        // Same token, but /me must reflect the DB, not the token's original claims.
        mockMvc.perform(get("/api/v1/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions", org.hamcrest.Matchers.hasSize(0)));
    }
}
