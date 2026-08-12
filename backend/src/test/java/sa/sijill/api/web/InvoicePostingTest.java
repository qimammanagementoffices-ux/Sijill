package sa.sijill.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.web.dto.CreateInventoryItemRequest;
import sa.sijill.api.web.dto.CreateInvoiceRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.InvoiceLineRequest;

@Transactional
class InvoicePostingTest extends AbstractIntegrationTest {

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

    private String createItem(String token) throws Exception {
        var request = new CreateInventoryItemRequest("صنف", "Item", null, "pcs", null, null, 5, 0, null);
        String body = mockMvc.perform(post("/api/v1/warehouse/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body).get("id").asText();
    }

    @Test
    void postingIncrementsQuantityAndUpdatesLastPrice() throws Exception {
        String token = createAdminAndGetToken("0594444444");
        String itemId = createItem(token);

        var invoiceRequest = new CreateInvoiceRequest(
                "INV-1001",
                LocalDate.now(),
                "Acme Supplies",
                new BigDecimal("15"),
                List.of(new InvoiceLineRequest(UUID.fromString(itemId), 20, new BigDecimal("10.00"))));

        mockMvc.perform(post("/api/v1/warehouse/invoices")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invoiceRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(200.0))
                .andExpect(jsonPath("$.taxTotal").value(30.0))
                .andExpect(jsonPath("$.total").value(230.0));

        String itemBody = mockMvc.perform(get("/api/v1/warehouse/items/" + itemId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode item = objectMapper.readTree(itemBody);
        org.assertj.core.api.Assertions.assertThat(item.get("quantity").asInt()).isEqualTo(20);
        org.assertj.core.api.Assertions.assertThat(item.get("lastPurchasePrice").asDouble()).isEqualTo(10.0);
    }

    @Test
    void duplicateInvoiceNumberIsRejected() throws Exception {
        String token = createAdminAndGetToken("0595555555");
        String itemId = createItem(token);

        var invoiceRequest = new CreateInvoiceRequest(
                "INV-DUP",
                LocalDate.now(),
                "Vendor",
                BigDecimal.ZERO,
                List.of(new InvoiceLineRequest(UUID.fromString(itemId), 1, new BigDecimal("5.00"))));

        mockMvc.perform(post("/api/v1/warehouse/invoices")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invoiceRequest)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/warehouse/invoices")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invoiceRequest)))
                .andExpect(status().isConflict());
    }
}
