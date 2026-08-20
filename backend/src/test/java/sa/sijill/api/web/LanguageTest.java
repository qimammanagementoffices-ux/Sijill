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

// Phase 9: admin-addable languages beyond ar/en/hi (decision-record.md D7).
// AI translation itself isn't exercised here — CI has no TRANSLATION_API_KEY,
// so app.translation.enabled defaults to false (same constraint noted on
// BackupTest for pg_dump/pg_restore) — which conveniently gives a
// deterministic, real "AI translation is not enabled" failure to test
// against, including the documented behavior that a failed translation
// still leaves the language row visible (not silently rolled back).
@Transactional
class LanguageTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private String createAdminAndGetToken(String phone) throws Exception {
        var request = new FirstAdminRequest("Admin", phone, "482913", "482913");
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
        var create = new CreateEmployeeRequest("Someone", phone, "482913", "482913", null, null, null, null, null, permissions, null);
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(create)));

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(phone, "482913"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(loginBody).get("token").asText();
    }

    @Test
    void listRequiresSysTranslations() throws Exception {
        String adminToken = createAdminAndGetToken("0599900301");
        String noPermToken = createEmployeeAndLogin(adminToken, "0599900302", Set.of());

        mockMvc.perform(get("/api/v1/i18n/languages").header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/i18n/languages").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rejectsReservedAndInvalidCodes() throws Exception {
        String adminToken = createAdminAndGetToken("0599900303");

        mockMvc.perform(post("/api/v1/i18n/languages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"ar\",\"name\":\"Arabic\",\"direction\":\"rtl\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/i18n/languages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"FR1\",\"name\":\"French\",\"direction\":\"ltr\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/i18n/languages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"fr\",\"name\":\"French\",\"direction\":\"sideways\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createFailsCleanlyWhenAiTranslationNotConfiguredButLanguageRowSurvives() throws Exception {
        String adminToken = createAdminAndGetToken("0599900304");

        mockMvc.perform(post("/api/v1/i18n/languages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"fr\",\"name\":\"French\",\"direction\":\"ltr\"}"))
                .andExpect(status().isBadRequest());

        // The row was still inserted before the (disabled) AI call ran —
        // documented behavior, not a bug: lets the admin see the failed
        // attempt and delete/retry rather than it vanishing silently.
        mockMvc.perform(get("/api/v1/i18n/languages").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("fr"));

        mockMvc.perform(get("/api/v1/i18n/languages/fr/values").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deleteOfUnknownLanguageReturns404() throws Exception {
        String adminToken = createAdminAndGetToken("0599900305");

        mockMvc.perform(delete("/api/v1/i18n/languages/zz").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }
}
