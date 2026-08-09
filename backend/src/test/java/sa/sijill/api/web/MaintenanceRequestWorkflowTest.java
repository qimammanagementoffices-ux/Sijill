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
import sa.sijill.api.domain.MaintenancePriority;
import sa.sijill.api.web.dto.*;

@Transactional
class MaintenanceRequestWorkflowTest extends AbstractIntegrationTest {

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
        var create = new CreateEmployeeRequest("Requester", phone, "1234", "1234", null, null, null, null, null, permissions, null);
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

    private String createPartWithStock(String adminToken, String code, int stock) throws Exception {
        var createPart = new CreateInventoryItemRequest(code, "قطعة", "Part", null, "pcs", null, null, 0, null);
        String partBody = mockMvc.perform(post("/api/v1/maintenance/parts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createPart)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String partId = objectMapper.readTree(partBody).get("id").asText();

        mockMvc.perform(post("/api/v1/maintenance/parts/" + partId + "/adjust-quantity")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new AdjustQuantityRequest(stock, "initial stock"))));
        return partId;
    }

    @Test
    void fullWorkflowSubmitApproveStartFinishWithPartsUsedDecrementsStock() throws Exception {
        String adminToken = createAdminAndGetToken("0599333333");
        String requesterToken = createEmployeeAndLogin(adminToken, "0599444444", Set.of("mt.request"));
        String partId = createPartWithStock(adminToken, "MPART-WF-001", 10);

        var submit = new SubmitMaintenanceRequestRequest(null, null, "Room 12", MaintenancePriority.HIGH, "AC not cooling");
        String submitBody = mockMvc.perform(post("/api/v1/maintenance/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requestId = objectMapper.readTree(submitBody).get("id").asText();

        mockMvc.perform(post("/api/v1/maintenance/requests/" + requestId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // Finish before START must fail.
        mockMvc.perform(post("/api/v1/maintenance/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/v1/maintenance/requests/" + requestId + "/start")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        var finish = new FinishMaintenanceRequestRequest(List.of(new PartUsedRequest(UUID.fromString(partId), 4)));
        mockMvc.perform(post("/api/v1/maintenance/requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finish)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.partsUsed[0].quantity").value(4));

        String partBody = mockMvc.perform(get("/api/v1/maintenance/parts/" + partId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andReturn()
                .getResponse()
                .getContentAsString();
        org.assertj.core.api.Assertions.assertThat(
                        objectMapper.readTree(partBody).get("quantity").asInt())
                .isEqualTo(6); // 10 - 4 used
    }

    @Test
    void requesterWithoutMtViewOnlySeesOwnRequests() throws Exception {
        String adminToken = createAdminAndGetToken("0599555555");
        String requesterAToken = createEmployeeAndLogin(adminToken, "0599666666", Set.of("mt.request"));
        String requesterBToken = createEmployeeAndLogin(adminToken, "0599777777", Set.of("mt.request"));

        var submit = new SubmitMaintenanceRequestRequest(null, null, "Room 5", MaintenancePriority.LOW, "leaky faucet");
        String submitBody = mockMvc.perform(post("/api/v1/maintenance/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(submitBody);

        mockMvc.perform(get("/api/v1/maintenance/requests").header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        mockMvc.perform(get("/api/v1/maintenance/requests/" + created.get("id").asText())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterBToken))
                .andExpect(status().isForbidden());
    }
}
