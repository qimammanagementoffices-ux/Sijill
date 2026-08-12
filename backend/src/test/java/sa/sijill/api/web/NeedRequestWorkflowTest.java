package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.web.dto.*;

@Transactional
class NeedRequestWorkflowTest extends AbstractIntegrationTest {

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
        var create = new CreateEmployeeRequest(
                "Requester", phone, "1234", "1234", null, null, null, null, null, permissions, null);
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

    private String createItemWithStock(String adminToken, int stock) throws Exception {
        var createItem = new CreateInventoryItemRequest("صنف", "Item", null, "pcs", null, null, 0, 0, null);
        String itemBody = mockMvc.perform(post("/api/v1/warehouse/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createItem)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String itemId = objectMapper.readTree(itemBody).get("id").asText();

        var adjust = new AdjustQuantityRequest(stock, "initial stock for test");
        mockMvc.perform(post("/api/v1/warehouse/items/" + itemId + "/adjust-quantity")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(adjust)));
        return itemId;
    }

    @Test
    void submitApproveFinishWithPartialFulfillmentDecrementsStock() throws Exception {
        String adminToken = createAdminAndGetToken("0596111111");
        String requesterToken = createEmployeeAndLogin(adminToken, "0596222222", Set.of("wh.request"));
        String itemId = createItemWithStock(adminToken, 10);

        var submit = new CreateNeedRequestRequest(
                null, null, null, "need some", List.of(new NeedRequestLineRequest(UUID.fromString(itemId), 5)));
        String submitBody = mockMvc.perform(post("/api/v1/warehouse/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(submitBody);
        String requestId = created.get("id").asText();
        String lineId = created.get("lines").get(0).get("id").asText();

        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        var finish = new FinishNeedRequestRequest(List.of(new FinishNeedRequestRequest.FinishLine(UUID.fromString(lineId), 3)));
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finish)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.lines[0].quantityIssued").value(3));

        String itemBody = mockMvc.perform(get("/api/v1/warehouse/items/" + itemId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andReturn()
                .getResponse()
                .getContentAsString();
        org.assertj.core.api.Assertions.assertThat(
                        objectMapper.readTree(itemBody).get("quantity").asInt())
                .isEqualTo(7); // 10 - 3 issued (not 5 requested)
    }

    @Test
    void finishFromNonApprovedStatusIsRejected() throws Exception {
        String adminToken = createAdminAndGetToken("0596333333");
        String requesterToken = createEmployeeAndLogin(adminToken, "0596444444", Set.of("wh.request"));
        String itemId = createItemWithStock(adminToken, 10);

        var submit = new CreateNeedRequestRequest(
                null, null, null, null, List.of(new NeedRequestLineRequest(UUID.fromString(itemId), 2)));
        String submitBody = mockMvc.perform(post("/api/v1/warehouse/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requestId = objectMapper.readTree(submitBody).get("id").asText();

        // Still PENDING, not APPROVED.
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isConflict());
    }

    @Test
    void requesterWithoutWhViewOnlySeesOwnRequests() throws Exception {
        String adminToken = createAdminAndGetToken("0596555555");
        String requesterAToken = createEmployeeAndLogin(adminToken, "0596666666", Set.of("wh.request"));
        String requesterBToken = createEmployeeAndLogin(adminToken, "0596777777", Set.of("wh.request"));
        String itemId = createItemWithStock(adminToken, 10);

        var submit = new CreateNeedRequestRequest(
                null, null, null, null, List.of(new NeedRequestLineRequest(UUID.fromString(itemId), 1)));
        String submitBody = mockMvc.perform(post("/api/v1/warehouse/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requestId = objectMapper.readTree(submitBody).get("id").asText();

        mockMvc.perform(get("/api/v1/warehouse/requests").header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        mockMvc.perform(get("/api/v1/warehouse/requests/" + requestId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterBToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/warehouse/requests").header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].actions[0].action").value("SUBMIT"))
                .andExpect(jsonPath("$.content[0].attachments.length()").value(0));
    }
}
