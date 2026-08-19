package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.MaintenancePriority;
import sa.sijill.api.web.dto.CreateEmployeeRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.LoginRequest;
import sa.sijill.api.web.dto.SubmitMaintenanceRequestRequest;
import sa.sijill.api.web.dto.UpdateBrandingRequest;

@Transactional
class AttachmentAndBrandingTest extends AbstractIntegrationTest {

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
        var create = new CreateEmployeeRequest("Someone", phone, "1234", "1234", null, null, null, null, null, permissions, null);
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

    @Test
    void uploadRejectsUnsupportedContentTypeBeforeTouchingStorage() throws Exception {
        String token = createAdminAndGetToken("0599900001");
        var file = new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes());

        mockMvc.perform(multipart("/api/v1/attachments")
                        .file(file)
                        .param("ownerType", "INVENTORY_ITEM")
                        .param("ownerId", UUID.randomUUID().toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadRejectsFilesLargerThanTwoMegabytesBeforeTouchingStorage() throws Exception {
        String token = createAdminAndGetToken("0599900009");
        var file = new MockMultipartFile("file", "large.png", "image/png", new byte[2 * 1024 * 1024 + 1]);

        mockMvc.perform(multipart("/api/v1/attachments")
                        .file(file)
                        .param("ownerType", "INVENTORY_ITEM")
                        .param("ownerId", UUID.randomUUID().toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.file").value("must be 2MB or smaller"));
    }

    @Test
    void uploadRequiresTheOwningDomainsManagePermission() throws Exception {
        String adminToken = createAdminAndGetToken("0599900002");
        String viewOnlyToken = createEmployeeAndLogin(adminToken, "0599900003", Set.of("wh.view"));
        var file = new MockMultipartFile("file", "photo.png", "image/png", "fake-png-bytes".getBytes());

        mockMvc.perform(multipart("/api/v1/attachments")
                        .file(file)
                        .param("ownerType", "INVENTORY_ITEM")
                        .param("ownerId", UUID.randomUUID().toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewOnlyToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void listReturnsEmptyForAnOwnerWithNoAttachments() throws Exception {
        String token = createAdminAndGetToken("0599900004");

        mockMvc.perform(get("/api/v1/attachments")
                        .param("ownerType", "ASSET")
                        .param("ownerId", UUID.randomUUID().toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void warehouseInvoiceAttachmentsUseInvoicePermissions() throws Exception {
        String adminToken = createAdminAndGetToken("0599900012");
        String viewToken = createEmployeeAndLogin(adminToken, "0599900013", Set.of("wh.invoices"));
        var file = new MockMultipartFile("file", "invoice.pdf", "application/pdf", "fake-pdf".getBytes());
        String invoiceId = UUID.randomUUID().toString();

        mockMvc.perform(get("/api/v1/attachments")
                        .param("ownerType", "WAREHOUSE_INVOICE")
                        .param("ownerId", invoiceId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewToken))
                .andExpect(status().isOk());

        mockMvc.perform(multipart("/api/v1/attachments")
                        .file(file)
                        .param("ownerType", "WAREHOUSE_INVOICE")
                        .param("ownerId", invoiceId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void maintenanceRequesterCanListRequestAttachmentsButNotSiteMaintenanceMedia() throws Exception {
        String adminToken = createAdminAndGetToken("0599900010");
        String requesterToken = createEmployeeAndLogin(adminToken, "0599900011", Set.of("mt.request"));
        var unsupportedFile = new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes());

        // A real request the requester owns: attachment access is now scoped to
        // the owning record, so a synthetic id is indistinguishable from an
        // enumeration attempt and is refused before any media check runs.
        var submit = new SubmitMaintenanceRequestRequest(null, null, "Room 3", MaintenancePriority.LOW, "flickering light");
        String submitBody = mockMvc.perform(post("/api/v1/maintenance/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submit)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String requestId = objectMapper.readTree(submitBody).get("id").asText();

        mockMvc.perform(get("/api/v1/attachments")
                        .param("ownerType", "MAINTENANCE")
                        .param("ownerId", requestId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Unsupported media reaches validation only when the requester's
        // maintenance attachment manage permission was accepted.
        mockMvc.perform(multipart("/api/v1/attachments")
                        .file(unsupportedFile)
                        .param("ownerType", "MAINTENANCE")
                        .param("ownerId", requestId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/attachments")
                        .param("ownerType", "MAINTENANCE")
                        .param("ownerId", "00000000-0000-0000-0000-000000000001")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteOfUnknownAttachmentReturns404() throws Exception {
        String token = createAdminAndGetToken("0599900005");

        mockMvc.perform(delete("/api/v1/attachments/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void brandingIsPublicAndUpdateRequiresSysBranding() throws Exception {
        String adminToken = createAdminAndGetToken("0599900006");
        String noPermToken = createEmployeeAndLogin(adminToken, "0599900007", Set.of());

        mockMvc.perform(get("/api/v1/branding"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preset").value("default"));

        var update = new UpdateBrandingRequest(
                "blue", "#2563eb", "#8B2635", null, null, null, null, null, null, null, null, null, 0);
        mockMvc.perform(put("/api/v1/branding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + noPermToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/branding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryColor").value("#2563eb"));

        mockMvc.perform(post("/api/v1/branding/reset")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preset").value("default"))
                .andExpect(jsonPath("$.primaryColor").value("#0f766e"));
    }

    @Test
    void invalidColorIsRejected() throws Exception {
        String adminToken = createAdminAndGetToken("0599900008");
        var update = new UpdateBrandingRequest(
                "custom", "not-a-color", "#8B2635", null, null, null, null, null, null, null, null, null, 0);

        mockMvc.perform(put("/api/v1/branding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isBadRequest());
    }
}
