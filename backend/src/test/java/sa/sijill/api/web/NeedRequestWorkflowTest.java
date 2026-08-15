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

        String seniorToken = createEmployeeAndLogin(
                adminToken, "0596888888", Set.of("wh.act.countersign", "wh.view", "sys.requests.all"));
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/countersign")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + seniorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // More than is on the shelf is refused. More than was approved is not:
        // the storekeeper records what physically left the warehouse, and only
        // stock can make an entry impossible. Stock here is 10.
        var tooMany = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(UUID.fromString(lineId), 11)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooMany)))
                .andExpect(status().isBadRequest());

        // 3 of 5 closes the request in one pass: the shortfall is recorded
        // against this delivery rather than leaving a remainder to chase.
        var finish = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(UUID.fromString(lineId), 3)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finish)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.lines[0].quantityIssued").value(3))
                // The approved quantity is untouched, so the card can show
                // "5 approved, 3 delivered".
                .andExpect(jsonPath("$.lines[0].quantityApproved").value(org.hamcrest.Matchers.nullValue()));

        // No second delivery: the request is no longer APPROVED.
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finish)))
                .andExpect(status().isConflict());

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
                .isEqualTo(7); // 10 - 3 issued; the undelivered 2 never left stock
    }

    /** Delivery is bounded by stock on hand, not by the approved quantity. */
    @Test
    void deliveryIsCappedAtStockNotAtTheApprovedQuantity() throws Exception {
        String adminToken = createAdminAndGetToken("0596991111");
        String requesterToken = createEmployeeAndLogin(adminToken, "0596992222", Set.of("wh.request"));
        String seniorToken = createEmployeeAndLogin(
                adminToken, "0596993333", Set.of("wh.act.countersign", "wh.view", "sys.requests.all"));
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

        var empty = new FinishNeedRequestRequest(List.of(new FinishNeedRequestRequest.FinishLine(lineId, 0)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(empty)))
                .andExpect(status().isBadRequest());

        // Beyond stock is refused: 10 on the shelf.
        var beyondStock = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(lineId, 11)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(beyondStock)))
                .andExpect(status().isBadRequest());

        // Above the approved 2 is allowed, and recorded as a difference against
        // the delivery: what left the warehouse is a fact, not a decision.
        var aboveApproved = new FinishNeedRequestRequest(
                List.of(new FinishNeedRequestRequest.FinishLine(lineId, 5)), null);
        mockMvc.perform(post("/api/v1/warehouse/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(aboveApproved)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].quantityIssued").value(5))
                .andExpect(jsonPath("$.actions[-1:].lineEdits[0].quantityBefore")
                        .value(org.hamcrest.Matchers.contains(2)))
                .andExpect(jsonPath("$.actions[-1:].lineEdits[0].quantityAfter")
                        .value(org.hamcrest.Matchers.contains(5)));
    }

    /** A short delivery closes the request and records the shortfall in its log. */
    @Test
    void aShortDeliveryClosesTheRequestAndRecordsTheShortfall() throws Exception {
        String adminToken = createAdminAndGetToken("0596994444");
        String requesterToken = createEmployeeAndLogin(adminToken, "0596995555", Set.of("wh.request"));
        String seniorToken = createEmployeeAndLogin(
                adminToken, "0596996666", Set.of("wh.act.countersign", "wh.view", "sys.requests.all"));
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
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.lines[0].quantityIssued").value(2))
                // The shortfall is attributed to the delivery itself: 5 approved,
                // 2 handed over, recorded as a line edit on the FINISH entry.
                .andExpect(jsonPath("$.actions[-1:].action").value(org.hamcrest.Matchers.contains("FINISH")))
                .andExpect(jsonPath("$.actions[-1:].lineEdits[0].quantityBefore")
                        .value(org.hamcrest.Matchers.contains(5)))
                .andExpect(jsonPath("$.actions[-1:].lineEdits[0].quantityAfter")
                        .value(org.hamcrest.Matchers.contains(2)));
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
