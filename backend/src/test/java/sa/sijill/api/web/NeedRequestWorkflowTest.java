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

        mockMvc.perform(get("/api/v1/warehouse/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/warehouse/items").param("size", "200")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isOk());

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

        mockMvc.perform(get("/api/v1/warehouse/items").param("size", "200")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '%s')].quantityRequested".formatted(itemId))
                        .value(org.hamcrest.Matchers.contains(5)));

        mockMvc.perform(get("/api/v1/warehouse/items")
                        .param("requestedOnly", "true")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(itemId))
                .andExpect(jsonPath("$.content[0].quantityRequested").value(5));

        // First level parks the request under review -- it is not deliverable yet.
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED_UNDER_REVIEW"));

        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isConflict());

        // The same official cannot counter-sign their own approval.
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/countersign")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isForbidden());

        String seniorToken = createEmployeeAndLogin(adminToken, "0596888888", Set.of("wh.act.countersign", "wh.view"));
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/countersign")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + seniorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // 3 of 5 leaves the request open rather than closing it and abandoning
        // the remaining 2.
        var partial = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(UUID.fromString(lineId), 3)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partial)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIALLY_DELIVERED"))
                .andExpect(jsonPath("$.lines[0].quantityIssued").value(3));

        // The remainder cannot be over-delivered: only 2 are still outstanding.
        var tooMany = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(UUID.fromString(lineId), 3)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooMany)))
                .andExpect(status().isBadRequest());

        // The second pass adds to what was already issued rather than replacing it.
        var finish = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(UUID.fromString(lineId), 2)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finish)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.lines[0].quantityIssued").value(5));

        // Only the requester closes the request by confirming receipt.
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/receive")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/receive")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        mockMvc.perform(get("/api/v1/warehouse/items").param("size", "200")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '%s')].quantityRequested".formatted(itemId))
                        .value(org.hamcrest.Matchers.contains(0)));

        mockMvc.perform(get("/api/v1/warehouse/items")
                        .param("requestedOnly", "true")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        String itemBody = mockMvc.perform(get("/api/v1/warehouse/items/" + itemId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andReturn()
                .getResponse()
                .getContentAsString();
        org.assertj.core.api.Assertions.assertThat(
                        objectMapper.readTree(itemBody).get("quantity").asInt())
                .isEqualTo(5); // 10 - 3 then - 2, deducted per delivery pass
    }

    /** A line trimmed during approval must not stay deliverable at the original quantity. */
    @Test
    void deliveryIsCappedAtTheApprovedQuantityNotTheRequestedOne() throws Exception {
        String adminToken = createAdminAndGetToken("0596991111");
        String requesterToken = createEmployeeAndLogin(adminToken, "0596992222", Set.of("wh.request"));
        String seniorToken = createEmployeeAndLogin(adminToken, "0596993333", Set.of("wh.act.countersign", "wh.view"));
        String itemId = createItemWithStock(adminToken, 10);

        var submit = new CreateNeedRequestRequest(
                null, null, null, null, List.of(new NeedRequestLineRequest(UUID.fromString(itemId), 5)));
        JsonNode created = objectMapper.readTree(mockMvc.perform(post("/api/v1/warehouse/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andReturn()
                .getResponse()
                .getContentAsString());
        String requestId = created.get("id").asText();
        UUID lineId = UUID.fromString(created.get("lines").get(0).get("id").asText());

        var trim = new RequestDecisionRequest(
                "نصف الكمية فقط", null, List.of(new RequestDecisionRequest.DecisionLine(lineId, 2, false)));
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(trim)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].quantityApproved").value(2))
                .andExpect(jsonPath("$.actions[-1:].lineEdits[0].quantityBefore").value(org.hamcrest.Matchers.contains(5)));

        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/countersign")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + seniorToken))
                .andExpect(status().isOk());

        var overDeliver = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(lineId, 5)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overDeliver)))
                .andExpect(status().isBadRequest());

        var empty = new FinishNeedRequestRequest(List.of(new FinishNeedRequestRequest.FinishLine(lineId, 0)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(empty)))
                .andExpect(status().isBadRequest());
    }

    /** A shortfall that will never arrive is written off, not left open forever. */
    @Test
    void writingOffTheRemainderClosesAShortDelivery() throws Exception {
        String adminToken = createAdminAndGetToken("0596994444");
        String requesterToken = createEmployeeAndLogin(adminToken, "0596995555", Set.of("wh.request"));
        String seniorToken = createEmployeeAndLogin(adminToken, "0596996666", Set.of("wh.act.countersign", "wh.view"));
        String itemId = createItemWithStock(adminToken, 10);

        var submit = new CreateNeedRequestRequest(
                null, null, null, null, List.of(new NeedRequestLineRequest(UUID.fromString(itemId), 5)));
        JsonNode created = objectMapper.readTree(mockMvc.perform(post("/api/v1/warehouse/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andReturn()
                .getResponse()
                .getContentAsString());
        String requestId = created.get("id").asText();
        UUID lineId = UUID.fromString(created.get("lines").get(0).get("id").asText());

        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken));
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/countersign")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + seniorToken));

        var partial = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(lineId, 2)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partial)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIALLY_DELIVERED"));

        // A write-off has to say why.
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/cancel-remainder")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isBadRequest());

        var writeOff = new RequestDecisionRequest("نفد المخزون", null, null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/cancel-remainder")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(writeOff)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                // The approved quantity drops to what was actually handed over,
                // so the shortfall is recorded rather than forgotten.
                .andExpect(jsonPath("$.lines[0].quantityApproved").value(2))
                .andExpect(jsonPath("$.lines[0].quantityIssued").value(2));
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
