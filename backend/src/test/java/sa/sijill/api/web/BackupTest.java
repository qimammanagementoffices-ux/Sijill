package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.UUID;
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

// Doesn't exercise a real pg_dump run — the CI runner isn't guaranteed to
// have the binary, same constraint noted for Phase 6a's attachment
// uploads. Covers permission gating and the list/download surface instead.
@Transactional
class BackupTest extends AbstractIntegrationTest {

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
        var create = new CreateEmployeeRequest("Someone", phone, "1234", "1234", null, null, null, null, null, permissions);
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
    void listAndTriggerRequireSysBackupPermission() throws Exception {
        String adminToken = createAdminAndGetToken("0599900101");
        String noPermToken = createEmployeeAndLogin(adminToken, "0599900102", Set.of());

        mockMvc.perform(get("/api/v1/backups").header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/backups").header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/backups").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void downloadOfUnknownBackupReturns404() throws Exception {
        String adminToken = createAdminAndGetToken("0599900103");

        mockMvc.perform(get("/api/v1/backups/" + UUID.randomUUID() + "/download")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    // Restore (Phase 7): these cover the gating (permission/PIN/rate-limit)
    // added around BackupService.restore, not a real pg_dump/pg_restore
    // round-trip — same CI-binary-availability caveat noted at the top of
    // this file applies to restore's own subprocess call.

    @Test
    void restoreRequiresSysBackupPermission() throws Exception {
        String adminToken = createAdminAndGetToken("0599900104");
        String noPermToken = createEmployeeAndLogin(adminToken, "0599900105", Set.of());

        mockMvc.perform(post("/api/v1/backups/" + UUID.randomUUID() + "/restore")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pin\":\"1234\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void restoreRequiresCorrectPin() throws Exception {
        String adminToken = createAdminAndGetToken("0599900106");

        mockMvc.perform(post("/api/v1/backups/" + UUID.randomUUID() + "/restore")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pin\":\"9999\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void restoreIsRateLimited() throws Exception {
        String adminToken = createAdminAndGetToken("0599900107");

        // RestoreRateLimiter allows 3 attempts/60s per employee; the wrong
        // PIN fails each of those with 409, the 4th trips the limiter (429).
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/v1/backups/" + UUID.randomUUID() + "/restore")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"pin\":\"9999\"}"))
                    .andExpect(status().isConflict());
        }

        mockMvc.perform(post("/api/v1/backups/" + UUID.randomUUID() + "/restore")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pin\":\"9999\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void deleteRequiresSysBackupPermission() throws Exception {
        String adminToken = createAdminAndGetToken("0599900108");
        String noPermToken = createEmployeeAndLogin(adminToken, "0599900109", Set.of());

        mockMvc.perform(delete("/api/v1/backups/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteOfUnknownBackupReturns404() throws Exception {
        String adminToken = createAdminAndGetToken("0599900110");

        mockMvc.perform(delete("/api/v1/backups/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }
}
