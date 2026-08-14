package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.AssetStatus;
import sa.sijill.api.domain.AssetRequestPriority;
import sa.sijill.api.domain.AssetRequestPurpose;
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
                                new UpsertRoomRequest("101", "قاعة 101", "Room 101", null, null, null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String roomId = objectMapper.readTree(roomBody).get("id").asText();

        String assetBody = mockMvc.perform(post("/api/v1/assets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAssetRequest(
                                "جهاز عرض",
                                "Projector",
                                null,
                                java.util.UUID.fromString(roomId),
                                null,
                                AssetStatus.ACTIVE,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null, null, null, null))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode asset = objectMapper.readTree(assetBody);
        String assetId = asset.get("id").asText();
        String publicToken = asset.get("publicToken").asText();
        // Server-assigned from asset_number_seq (V63), so carry the value
        // through rather than asserting a literal the caller no longer picks.
        String assetNumber = asset.get("assetNumber").asText();

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
                .andExpect(jsonPath("$[0].assetNumber").value(assetNumber));

        // Public QR view — allowlisted fields only, no cost/vendor/notes/custodian.
        mockMvc.perform(get("/api/v1/public/assets/" + publicToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetNumber").value(assetNumber))
                .andExpect(jsonPath("$.nameEn").value("Projector"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.vendor").doesNotExist())
                .andExpect(jsonPath("$.acquisitionCost").doesNotExist())
                .andExpect(jsonPath("$.notes").doesNotExist())
                .andExpect(jsonPath("$.custodianName").doesNotExist());
    }

    @Test
    void legacyStyleTabsSubmitPurchaseAndMoveTransferAsset() throws Exception {
        String adminToken = createAdminAndGetToken("0599888333");

        String departmentBody = mockMvc.perform(post("/api/v1/departments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertLocalizedEntityRequest("الإدارة", "Administration", null, null, null))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        UUID departmentId = UUID.fromString(objectMapper.readTree(departmentBody).get("id").asText());

        var employee = new CreateEmployeeRequest(
                "Transfer requester",
                "0599888444",
                "1234",
                "1234",
                null,
                null,
                null,
                null,
                List.of(departmentId),
                Set.of("as.request"),
                null);
        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employee)))
                .andExpect(status().isOk());
        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0599888444", "1234"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requesterToken = objectMapper.readTree(loginBody).get("token").asText();

        String categoryBody = mockMvc.perform(post("/api/v1/assets/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertCategoryRequest("أجهزة حاسوب", "Computers", null, "💻", null))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        UUID categoryId = UUID.fromString(objectMapper.readTree(categoryBody).get("id").asText());

        var purchase = new SubmitAssetRequestRequest(
                null,
                "New computers",
                departmentId,
                null,
                AssetRequestPurpose.PURCHASE,
                AssetRequestPriority.URGENT,
                null,
                List.of(new AssetRequestLineRequest(null, categoryId, 3)));
        mockMvc.perform(post("/api/v1/asset-requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(purchase)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purpose").value("PURCHASE"))
                .andExpect(jsonPath("$.priority").value("URGENT"))
                .andExpect(jsonPath("$.lines[0].categoryId").value(categoryId.toString()))
                .andExpect(jsonPath("$.lines[0].quantity").value(3));

        UUID sourceRoomId = createRoom(adminToken, "201", "غرفة المصدر", "Source room", departmentId);
        UUID destinationRoomId = createRoom(adminToken, "202", "غرفة الوجهة", "Destination room", departmentId);

        String assetBody = mockMvc.perform(post("/api/v1/assets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAssetRequest(
                                "طابعة",
                                "Printer",
                                null,
                                sourceRoomId,
                                null,
                                AssetStatus.ACTIVE,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        UUID assetId = UUID.fromString(objectMapper.readTree(assetBody).get("id").asText());

        var submit = new SubmitAssetRequestRequest(
                null,
                "Move the printer",
                departmentId,
                sourceRoomId,
                AssetRequestPurpose.TRANSFER,
                AssetRequestPriority.NORMAL,
                destinationRoomId,
                List.of(new AssetRequestLineRequest(assetId, null, 1)));
        String requestBody = mockMvc.perform(post("/api/v1/asset-requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purpose").value("TRANSFER"))
                .andExpect(jsonPath("$.lines[0].assetId").value(assetId.toString()))
                .andExpect(jsonPath("$.destinationRoom.id").value(destinationRoomId.toString()))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requestId = objectMapper.readTree(requestBody).get("id").asText();

        mockMvc.perform(post("/api/v1/asset-requests/" + requestId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/asset-requests/" + requestId + "/finish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        mockMvc.perform(get("/api/v1/assets/" + assetId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.room.id").value(destinationRoomId.toString()));
    }

    private UUID createRoom(String token, String number, String nameAr, String nameEn, UUID departmentId)
            throws Exception {
        String body = mockMvc.perform(post("/api/v1/rooms")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertRoomRequest(number, nameAr, nameEn, null, departmentId, null, null))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }
}
