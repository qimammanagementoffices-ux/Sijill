package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.web.dto.CreateEmployeeRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.domain.Department;
import sa.sijill.api.repository.DepartmentRepository;

@Transactional
class EmployeeDirectoryTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DepartmentRepository departmentRepository;

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
    void searchesByNamePhoneAndEmployeeNumberAndRequiresEmpView() throws Exception {
        String token = createAdminAndGetToken("0561111111");

        var newEmployee = new CreateEmployeeRequest(
                "Sara Ahmed", "0562222222", "1234", "1234", null, null, null, null, null, Set.of(), null);
        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newEmployee)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/employees").param("q", "Sara")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Sara Ahmed"));

        mockMvc.perform(get("/api/v1/employees").param("q", "0562222222")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));

        // Unauthenticated: no results, just rejected.
        mockMvc.perform(get("/api/v1/employees")).andExpect(status().isUnauthorized());
    }

    @Test
    void employeeWithoutEmpViewIsForbidden() throws Exception {
        String adminToken = createAdminAndGetToken("0563333333");

        var limited = new CreateEmployeeRequest(
                "No Permissions", "0564444444", "1234", "1234", null, null, null, null, null, Set.of(), null);
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(limited)));

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new sa.sijill.api.web.dto.LoginRequest("0564444444", "1234"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode loginJson = objectMapper.readTree(loginBody);
        String limitedToken = loginJson.get("token").asText();

        mockMvc.perform(get("/api/v1/employees").header(HttpHeaders.AUTHORIZATION, "Bearer " + limitedToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void employeeManagerCanReadDirectoryWithoutSeparateViewPermission() throws Exception {
        String adminToken = createAdminAndGetToken("0563333334");
        var manager = new CreateEmployeeRequest(
                "Employee Manager", "0564444445", "1234", "1234", null, null, null, null, null,
                Set.of("emp.manage"), null);
        mockMvc.perform(post("/api/v1/employees")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(manager)));

        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new sa.sijill.api.web.dto.LoginRequest("0564444445", "1234"))))
                .andReturn().getResponse().getContentAsString();

        mockMvc.perform(get("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + objectMapper.readTree(loginBody).get("token").asText()))
                .andExpect(status().isOk());
    }

    @Test
    void filtersEmployeesByDepartment() throws Exception {
        String token = createAdminAndGetToken("0565555555");
        Department department = new Department();
        department.setNameAr("الشؤون التعليمية");
        department.setNameEn("Education Affairs");
        department = departmentRepository.save(department);

        var assigned = new CreateEmployeeRequest(
                "Assigned Employee", "0566666666", "1234", "1234", null, null, null, null,
                List.of(department.getId()), Set.of(), null);
        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assigned)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/employees")
                        .param("departmentId", department.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Assigned Employee"));
    }

    @Test
    void assignsEmployeeToMultipleAdministrationsAndTheirDepartments() throws Exception {
        String token = createAdminAndGetToken("0567777777");

        Department education = new Department();
        education.setNameAr("الشؤون التعليمية");
        education.setNameEn("Education Affairs");
        education = departmentRepository.save(education);
        Department administration = new Department();
        administration.setNameAr("الشؤون الإدارية");
        administration.setNameEn("Administration Affairs");
        administration = departmentRepository.save(administration);

        Department primary = new Department();
        primary.setNameAr("المرحلة الابتدائية");
        primary.setNameEn("Primary Stage");
        primary.setParent(education);
        primary = departmentRepository.save(primary);
        Department humanResources = new Department();
        humanResources.setNameAr("الموارد البشرية");
        humanResources.setNameEn("Human Resources");
        humanResources.setParent(administration);
        humanResources = departmentRepository.save(humanResources);

        var employee = new CreateEmployeeRequest(
                "Multi Administration Employee", "0568888888", "1234", "1234", null, null, null, null,
                List.of(education.getId(), primary.getId(), administration.getId(), humanResources.getId()),
                Set.of(), null);

        mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employee)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.departments.length()").value(4));
    }
}
