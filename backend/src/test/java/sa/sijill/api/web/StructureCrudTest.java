package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.UpsertLocalizedEntityRequest;

@Transactional
class StructureCrudTest extends AbstractIntegrationTest {

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

    @Test
    void departmentReadsAreOpenToAnyAuthenticatedUserWritesRequireEmpStructure() throws Exception {
        String token = createAdminAndGetToken("0581111111");

        var create = new UpsertLocalizedEntityRequest("العلوم", "Science", null, null, null);
        String createBody = mockMvc.perform(post("/api/v1/departments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(createBody);

        mockMvc.perform(get("/api/v1/departments").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nameEn").exists());

        mockMvc.perform(get("/api/v1/departments")).andExpect(status().isUnauthorized());

        var badVersionUpdate = new UpsertLocalizedEntityRequest("العلوم والتقنية", "Science & Tech", 999, null, null);
        mockMvc.perform(put("/api/v1/departments/" + created.get("id").asText())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badVersionUpdate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.current.nameEn").value("Science"));
    }

    @Test
    void jobTitleCreateRequiresEmpStructure() throws Exception {
        String adminToken = createAdminAndGetToken("0582222222");

        var noPermsEmployee = new sa.sijill.api.web.dto.CreateEmployeeRequest(
                "No Structure Perm", "0583333333", "1234", "1234", null, null, null, null, null,
                java.util.Set.of("emp.view"), null);
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(noPermsEmployee)));

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new sa.sijill.api.web.dto.LoginRequest("0583333333", "1234"))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String limitedToken = objectMapper.readTree(loginBody).get("token").asText();

        var request = new UpsertLocalizedEntityRequest("معلم", "Teacher", null, null, null);
        mockMvc.perform(post("/api/v1/job-titles")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + limitedToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void departmentHierarchySupportsParentsAndRejectsCycles() throws Exception {
        String token = createAdminAndGetToken("0584444444");

        JsonNode parent = objectMapper.readTree(mockMvc.perform(post("/api/v1/departments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertLocalizedEntityRequest("الإدارة", "Administration", null, null, null))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        JsonNode child = objectMapper.readTree(mockMvc.perform(post("/api/v1/departments")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpsertLocalizedEntityRequest(
                                "المشتريات", "Procurement", null, null, java.util.UUID.fromString(parent.get("id").asText())))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentId").value(parent.get("id").asText()))
                .andReturn().getResponse().getContentAsString());

        var validAssignment = new sa.sijill.api.web.dto.CreateEmployeeRequest(
                "Hierarchy Employee", "0585555555", "1234", "1234", null, null, null, null,
                java.util.List.of(
                        java.util.UUID.fromString(parent.get("id").asText()),
                        java.util.UUID.fromString(child.get("id").asText())),
                java.util.Set.of("emp.view"), null);
        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validAssignment)))
                .andExpect(status().isOk());

        var missingAdministration = new sa.sijill.api.web.dto.CreateEmployeeRequest(
                "Invalid Hierarchy Employee", "0586666666", "1234", "1234", null, null, null, null,
                java.util.List.of(java.util.UUID.fromString(child.get("id").asText())),
                java.util.Set.of("emp.view"), null);
        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingAdministration)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/v1/departments/" + parent.get("id").asText())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpsertLocalizedEntityRequest(
                                "الإدارة", "Administration", parent.get("version").asInt(), null,
                                java.util.UUID.fromString(child.get("id").asText())))))
                .andExpect(status().isBadRequest());
    }
}
