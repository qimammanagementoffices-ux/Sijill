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
import sa.sijill.api.web.dto.CreateEmployeeRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.LoginRequest;
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
        var create = new CreateEmployeeRequest("Someone", phone, "1234", "1234", null, null, null, null, null, permissions);
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

        var update = new UpdateBrandingRequest("blue", "#2563eb", "#8B2635", null, null, null, null, null, 0);
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
        var update = new UpdateBrandingRequest("custom", "not-a-color", "#8B2635", null, null, null, null, null, 0);

        mockMvc.perform(put("/api/v1/branding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isBadRequest());
    }
}
