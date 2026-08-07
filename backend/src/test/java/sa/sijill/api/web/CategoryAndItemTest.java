package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import sa.sijill.api.web.dto.CreateInventoryItemRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.LoginRequest;
import sa.sijill.api.web.dto.UpsertLocalizedEntityRequest;

@Transactional
class CategoryAndItemTest extends AbstractIntegrationTest {

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

    private String createCategory(String token) throws Exception {
        var request = new UpsertLocalizedEntityRequest("قرطاسية", "Stationery", null);
        String body = mockMvc.perform(post("/api/v1/warehouse/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body).get("id").asText();
    }

    @Test
    void createItemAndFlagsLowStock() throws Exception {
        String token = createAdminAndGetToken("0591111111");
        String categoryId = createCategory(token);

        var request = new CreateInventoryItemRequest(
                "PEN-001", "قلم", "Pen", java.util.UUID.fromString(categoryId), "box", null, null, 10);

        String body = mockMvc.perform(post("/api/v1/warehouse/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(0))
                .andExpect(jsonPath("$.lowStock").value(true)) // 0 <= minQuantity(10)
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode created = objectMapper.readTree(body);
        mockMvc.perform(get("/api/v1/warehouse/items/" + created.get("id").asText())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("PEN-001"));
    }

    @Test
    void itemManagementRequiresWhItemsNotJustWhView() throws Exception {
        String adminToken = createAdminAndGetToken("0592222222");

        var limited = new CreateEmployeeRequest(
                "Viewer Only", "0593333333", "1234", "1234", null, null, null, null, null, Set.of("wh.view"));
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(limited)));

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0593333333", "1234"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String viewerToken = objectMapper.readTree(loginBody).get("token").asText();

        var request = new CreateInventoryItemRequest("X-1", "س", "X", null, null, null, null, 0);
        mockMvc.perform(post("/api/v1/warehouse/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/warehouse/items").header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk());
    }
}
