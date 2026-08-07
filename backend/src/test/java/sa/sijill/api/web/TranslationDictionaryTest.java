package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;

@Transactional
class TranslationDictionaryTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void publicDictionaryReturnsSeededValuesWithNoAuth() throws Exception {
        mockMvc.perform(get("/api/v1/i18n/dictionary").param("locale", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['common.appName']").value("Sijill"));

        mockMvc.perform(get("/api/v1/i18n/dictionary").param("locale", "ar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['common.save']").value("حفظ"));

        mockMvc.perform(get("/api/v1/i18n/dictionary").param("locale", "hi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['common.save']").exists());
    }

    @Test
    void unknownLocaleReturnsEmptyMapNotError() throws Exception {
        mockMvc.perform(get("/api/v1/i18n/dictionary").param("locale", "fr"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }
}
