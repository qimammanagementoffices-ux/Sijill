package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

// Phase 8: site maintenance-mode. "siteMaintenance" throughout to stay
// distinct from the unrelated building-maintenance-request module.
@Transactional
class MaintenanceTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private String createAdminAndGetToken(String phone) throws Exception {
        var request = new FirstAdminRequest("Admin", phone, "1234", "1234");
        String body = mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }

    private String createEmployeeAndLogin(String adminToken, String phone, Set<String> permissions) throws Exception {
        var create = new CreateEmployeeRequest("Someone", phone, "1234", "1234", null, null, null, null, null, permissions, null);
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(create)));

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(phone, "1234"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(loginBody).get("token").asText();
    }

    @Test
    void statusIsPublicAndDisabledByDefault() throws Exception {
        mockMvc.perform(get("/api/v1/maintenance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    void updateRequiresSysMaintenance() throws Exception {
        String adminToken = createAdminAndGetToken("0599900201");
        String noPermToken = createEmployeeAndLogin(adminToken, "0599900202", Set.of());

        mockMvc.perform(put("/api/v1/maintenance")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true,\"version\":0}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void enablingBlocksNonBypassCallersButNotBypassHoldersOrLogin() throws Exception {
        String adminToken = createAdminAndGetToken("0599900203");
        // Admin created by first-admin holds every permission, including
        // sys.maintenance, so it doubles as the bypass-holder here.
        String noPermToken = createEmployeeAndLogin(adminToken, "0599900204", Set.of());

        mockMvc.perform(put("/api/v1/maintenance")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true,\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));

        // A non-bypass authenticated caller gets blocked on an otherwise-fine request.
        mockMvc.perform(get("/api/v1/employees").header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken))
                .andExpect(status().isServiceUnavailable());

        // The bypass holder (sys.maintenance) still gets through normally.
        mockMvc.perform(get("/api/v1/employees").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Login itself must still work — otherwise nobody could log in to
        // turn maintenance mode back off.
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0599900204", "1234"))))
                .andExpect(status().isOk());

        // Public status/dictionary endpoints stay reachable too, so the
        // maintenance page itself can actually render.
        mockMvc.perform(get("/api/v1/maintenance")).andExpect(status().isOk());
    }
}
