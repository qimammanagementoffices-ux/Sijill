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
import sa.sijill.api.web.dto.CreateInventoryItemRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.UpsertFaultTypeRequest;

@Transactional
class FaultTypeAndPartsTest extends AbstractIntegrationTest {

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
    void faultTypeCreateWithSuggestedCategory() throws Exception {
        String token = createAdminAndGetToken("0599111111");

        String categoryBody = mockMvc.perform(post("/api/v1/maintenance/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new sa.sijill.api.web.dto.UpsertCategoryRequest("كهرباء", "Electrical", null, null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String categoryId = objectMapper.readTree(categoryBody).get("id").asText();

        var faultType = new UpsertFaultTypeRequest("عطل كهربائي", "Electrical fault", java.util.UUID.fromString(categoryId), null, null);
        mockMvc.perform(post("/api/v1/maintenance/fault-types")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(faultType)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestedCategory.en").value("Electrical"));
    }

    @Test
    void maintenancePartsAreDomainSeparatedFromWarehouseItems() throws Exception {
        String token = createAdminAndGetToken("0599222222");

        var part = new CreateInventoryItemRequest("MPART-001", "قطعة", "Part", null, "pcs", null, null, 0, null);
        mockMvc.perform(post("/api/v1/maintenance/parts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(part)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/maintenance/parts").param("q", "MPART-001")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));

        mockMvc.perform(get("/api/v1/warehouse/items").param("q", "MPART-001")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
    }
}
