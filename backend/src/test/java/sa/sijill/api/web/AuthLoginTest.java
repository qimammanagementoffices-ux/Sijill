package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.LoginRequest;

// Dirties the context after this class so the in-memory LoginRateLimiter
// singleton (deliberately not DB state, so @Transactional rollback doesn't
// touch it) can't leak rate-limit counters into other test classes.
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AuthLoginTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @BeforeEach
    void createAdmin() throws Exception {
        var request = new FirstAdminRequest("Admin Name", "0512345678", "1234", "1234");
        mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void correctCredentialsIssueToken() throws Exception {
        var login = new LoginRequest("0512345678", "1234");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void wrongPinReturnsGenericUnauthenticated() throws Exception {
        var login = new LoginRequest("0512345678", "0000");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.error.message").value("Invalid phone number or PIN"));
    }

    @Test
    void unknownPhoneReturnsSameGenericMessageAsWrongPin() throws Exception {
        var login = new LoginRequest("0599999999", "1234");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.message").value("Invalid phone number or PIN"));
    }

    @Test
    void rapidFailedAttemptsAreRateLimited() throws Exception {
        var login = new LoginRequest("0512345678", "0000");
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
}
