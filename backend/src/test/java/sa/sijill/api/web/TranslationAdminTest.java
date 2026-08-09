package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
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
import sa.sijill.api.web.dto.UpdateTranslationRequest;

@Transactional
class TranslationAdminTest extends AbstractIntegrationTest {

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

    @Test
    void listAndUpdateRequireSysTranslations() throws Exception {
        String adminToken = createAdminAndGetToken("0597111111");

        var noPermsEmployee = new CreateEmployeeRequest(
                "No Perms", "0597222222", "1234", "1234", null, null, null, null, null, Set.of(), null);
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(noPermsEmployee)));

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0597222222", "1234"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String limitedToken = objectMapper.readTree(loginBody).get("token").asText();

        mockMvc.perform(get("/api/v1/i18n/translations").header(HttpHeaders.AUTHORIZATION, "Bearer " + limitedToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/i18n/translations").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test
    void staleVersionUpdateReturns409WithEmbeddedCurrent() throws Exception {
        String adminToken = createAdminAndGetToken("0597333333");

        String listBody = mockMvc.perform(get("/api/v1/i18n/translations")
                        .param("q", "common.appName")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode first = objectMapper.readTree(listBody).get("content").get(0);
        String key = first.get("key").asText();

        var staleUpdate = new UpdateTranslationRequest("محدث", "Updated", "अद्यतन", 999);
        mockMvc.perform(put("/api/v1/i18n/translations/" + key)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleUpdate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.current.key").value(key));

        var validUpdate = new UpdateTranslationRequest("محدث", "Updated", "अद्यतन", first.get("version").asInt());
        mockMvc.perform(put("/api/v1/i18n/translations/" + key)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valueEn").value("Updated"));
    }
}
