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
import sa.sijill.api.domain.AssetStatus;
import sa.sijill.api.web.dto.*;

@Transactional
class AssetWorkflowTest extends AbstractIntegrationTest {

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
        String body = mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(phone, "1234"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(loginBody).get("token").asText();
    }

    @Test
    void fullWorkflowSubmitApproveFinishTransfersCustodyAndRecordsHistory() throws Exception {
        String adminToken = createAdminAndGetToken("0599888111");
        String requesterBody = mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateEmployeeRequest(
                                "Requester", "0599888222", "1234", "1234", null, null, null, null, null,
                                Set.of("as.request"), null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requesterId = objectMapper.readTree(requesterBody).get("id").asText();
        String requesterToken = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0599888222", "1234"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        requesterToken = objectMapper.readTree(requesterToken).get("token").asText();

        String roomBody = mockMvc.perform(post("/api/v1/rooms")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertRoomRequest("101", "قاعة 101", "Room 101", "Main", "1", null, null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String roomId = objectMapper.readTree(roomBody).get("id").asText();

        String assetBody = mockMvc.perform(post("/api/v1/assets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAssetRequest(
                                "AST-001",
                                "جهاز عرض",
                                "Projector",
                                null,
                                java.util.UUID.fromString(roomId),
                                null,
                                AssetStatus.ACTIVE,
                                null,
                                null,
                                null,
                                null))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode asset = objectMapper.readTree(assetBody);
        String assetId = asset.get("id").asText();
        String publicToken = asset.get("publicToken").asText();

        var submit = new SubmitAssetRequestRequest(java.util.UUID.fromString(assetId), "need it for class");
        String submitBody = mockMvc.perform(post("/api/v1/asset-requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requestId = objectMapper.readTree(submitBody).get("id").asText();

        mockMvc.perform(post("/api/v1/asset-requests/" + requestId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(post("/api/v1/asset-requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        mockMvc.perform(get("/api/v1/assets/" + assetId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.custodianId").value(requesterId));

        mockMvc.perform(get("/api/v1/assets/" + assetId + "/transfers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].toEmployeeName").value("Requester"));

        mockMvc.perform(get("/api/v1/assets/custody-report/" + requesterId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].assetNumber").value("AST-001"));

        // Public QR view — allowlisted fields only, no cost/vendor/notes/custodian.
        mockMvc.perform(get("/api/v1/public/assets/" + publicToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetNumber").value("AST-001"))
                .andExpect(jsonPath("$.nameEn").value("Projector"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.vendor").doesNotExist())
                .andExpect(jsonPath("$.acquisitionCost").doesNotExist())
                .andExpect(jsonPath("$.notes").doesNotExist())
                .andExpect(jsonPath("$.custodianName").doesNotExist());
    }
}
