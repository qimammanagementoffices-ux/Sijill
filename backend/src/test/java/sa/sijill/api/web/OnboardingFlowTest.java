package sa.sijill.api.web;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.repository.PermissionRepository;
import sa.sijill.api.web.dto.FirstAdminRequest;

@Transactional
class OnboardingFlowTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PermissionRepository permissionRepository;

    @Test
    void firstAdminCreationGrantsEveryPermissionAndLogsIn() throws Exception {
        long permissionCount = permissionRepository.count();
        var request = new FirstAdminRequest("Admin Name", "0512345678", "482913", "482913");

        mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.employee.permissions", hasSize((int) permissionCount)));
    }

    @Test
    void secondFirstAdminAttemptIsRejected() throws Exception {
        var first = new FirstAdminRequest("Admin One", "0511111111", "482913", "482913");
        mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(first)))
                .andExpect(status().isOk());

        var second = new FirstAdminRequest("Admin Two", "0522222222", "571934", "571934");
        mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(second)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    void mismatchedPinConfirmationIsRejected() throws Exception {
        var request = new FirstAdminRequest("Admin Name", "0533333333", "482913", "736182");

        mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }
}
