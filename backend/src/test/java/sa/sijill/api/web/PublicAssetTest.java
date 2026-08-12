package sa.sijill.api.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.AssetStatus;
import sa.sijill.api.web.dto.CreateAssetRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;

// Phase 7: decision-record.md D2's public QR page is an unauthenticated
// endpoint restricted to an explicit field allowlist (PublicAssetDto) — this
// asserts the response's field *set*, not just individual field values, so
// an accidental future addition to PublicAssetDto (or to Asset re-exposed
// there) fails this test instead of silently leaking data.
@Transactional
class PublicAssetTest extends AbstractIntegrationTest {

    private static final Set<String> ALLOWED_FIELDS =
            Set.of("assetNumber", "nameAr", "nameEn", "category", "room", "status", "photoUrl");

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
    void publicAssetResponseOnlyContainsAllowlistedFields() throws Exception {
        String adminToken = createAdminAndGetToken("0598800001");

        var create = new CreateAssetRequest(
                "أصل",
                "Asset",
                null,
                null,
                null,
                AssetStatus.ACTIVE,
                LocalDate.now(),
                new BigDecimal("999.99"), // acquisitionCost — must not leak
                "Some Vendor", // vendor — must not leak
                "Sensitive internal notes", // notes — must not leak
                null, null, null, null, null);
        String createBody = mockMvc.perform(post("/api/v1/assets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String publicToken =
                objectMapper.readTree(createBody).get("publicToken").asText();

        String publicBody = mockMvc.perform(get("/api/v1/public/assets/" + publicToken))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode root = objectMapper.readTree(publicBody);
        Set<String> actualFields = new HashSet<>();
        for (Iterator<String> it = root.fieldNames(); it.hasNext(); ) {
            actualFields.add(it.next());
        }

        assertThat(actualFields).isEqualTo(ALLOWED_FIELDS);
        assertThat(publicBody).doesNotContain("999.99").doesNotContain("Some Vendor").doesNotContain("Sensitive internal notes");
    }
}
