package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.LoginRequest;
import sa.sijill.api.web.dto.UpdateEmployeeRequest;
import sa.sijill.api.web.dto.UpdatePermissionsRequest;

@Transactional
class EmployeeLifecycleTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private String createAdminAndGetToken(String phone) throws Exception {
        var request = new FirstAdminRequest("Admin", phone, "482913", "482913");
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
    void createGrantsExactlyRequestedPermissions() throws Exception {
        String token = createAdminAndGetToken("0571111111");

        var request = new CreateEmployeeRequest(
                "Limited User", "0572222222", "482913", "482913", null, null, null, null, null,
                Set.of("emp.view", "wh.view"), null);

        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions.length()").value(2))
                .andExpect(jsonPath("$.permissions", org.hamcrest.Matchers.containsInAnyOrder("emp.view", "wh.view")));
    }

    @Test
    void staleVersionUpdateReturns409WithEmbeddedCurrent() throws Exception {
        String token = createAdminAndGetToken("0573333333");

        var create = new CreateEmployeeRequest(
                "Edit Me", "0574444444", "482913", "482913", null, null, null, null, null, Set.of(), null);
        String createBody = mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(createBody);
        String id = created.get("id").asText();

        var staleUpdate = new UpdateEmployeeRequest("Edit Me Updated", "0574444444", null, null, null, null, 999, null);
        mockMvc.perform(put("/api/v1/employees/" + id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staleUpdate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"))
                .andExpect(jsonPath("$.current.id").value(id));
    }

    @Test
    void deactivateBlocksLoginAndReactivateRestoresAccess() throws Exception {
        String token = createAdminAndGetToken("0575555555");

        var create = new CreateEmployeeRequest(
                "Soon Deactivated", "0576666666", "482913", "482913", null, null, null, null, null, Set.of(), null);
        String createBody = mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String id = objectMapper.readTree(createBody).get("id").asText();

        mockMvc.perform(post("/api/v1/employees/" + id + "/deactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/employees/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0576666666", "482913"))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/employees/" + id + "/reactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("0576666666", "482913"))))
                .andExpect(status().isOk());
    }

    @Test
    void permissionChangeIsAuditedAndVersionChecked() throws Exception {
        String token = createAdminAndGetToken("0577777777");

        var create = new CreateEmployeeRequest(
                "Perm Target", "0578888888", "482913", "482913", null, null, null, null, null, Set.of("emp.view"), null);
        String createBody = mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(createBody);
        String id = created.get("id").asText();
        int version = created.get("version").asInt();

        var permUpdate = new UpdatePermissionsRequest(Set.of("emp.view", "emp.manage"), version);
        mockMvc.perform(put("/api/v1/employees/" + id + "/permissions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(permUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions.length()").value(2));
    }
}
