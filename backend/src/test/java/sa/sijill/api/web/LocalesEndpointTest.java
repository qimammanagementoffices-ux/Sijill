package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.web.dto.FirstAdminRequest;

// GET /i18n/locales backs the frontend's language switcher (LocaleSwitcher.tsx)
// -- public, no auth, since every visitor needs it before picking a locale,
// unlike GET /i18n/languages (the admin management list, sys.translations-gated).
@Transactional
class LocalesEndpointTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void listsBuiltInLocalesWithNoAuth() throws Exception {
        mockMvc.perform(get("/api/v1/i18n/locales"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code=='ar')].direction").value("rtl"))
                .andExpect(jsonPath("$[?(@.code=='en')].direction").value("ltr"))
                .andExpect(jsonPath("$[?(@.code=='hi')].direction").value("ltr"));
    }

    @Test
    void includesAdminAddedLanguages() throws Exception {
        var request = new FirstAdminRequest("Admin", "0599900401", "482913", "482913");
        String body = mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String adminToken = objectMapper.readTree(body).get("token").asText();

        mockMvc.perform(post("/api/v1/i18n/languages")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"fr\",\"name\":\"Francais\",\"direction\":\"ltr\"}"));

        // AI translation isn't configured in CI (see LanguageTest's own
        // comment), so the create call above 400s -- but per that same
        // documented behavior, the Language row is still inserted before the
        // AI call runs, so it should already be visible here with no auth.
        mockMvc.perform(get("/api/v1/i18n/locales"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code=='fr')].name").value("Francais"));
    }
}
