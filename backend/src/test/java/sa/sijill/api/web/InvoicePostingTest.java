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
import sa.sijill.api.domain.DiscountType;
import sa.sijill.api.web.dto.CreateInventoryItemRequest;
import sa.sijill.api.web.dto.CreateInvoiceRequest;
import sa.sijill.api.web.dto.FirstAdminRequest;
import sa.sijill.api.web.dto.InvoiceLineRequest;

@Transactional
class InvoicePostingTest extends AbstractIntegrationTest {

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

    @Test
    void postingWithMixedLineTaxAndDiscount() throws Exception {
        String token = createAdminAndGetToken("0596666666");
        String item1 = createItem(token);
        String item2 = createItem(token);

        var invoiceRequest = new CreateInvoiceRequest(
                "INV-MIXED-API",
                LocalDate.now(),
                "Modern Supplies",
                null,
                DiscountType.PERCENTAGE,
                new BigDecimal("10"),
                List.of(
                        new InvoiceLineRequest(UUID.fromString(item1), 2, new BigDecimal("100.00"), new BigDecimal("15")),
                        new InvoiceLineRequest(UUID.fromString(item2), 1, new BigDecimal("50.00"), new BigDecimal("5"))
                ));

        // Subtotal = 200 + 50 = 250.00
        // TaxTotal = 30 + 2.50 = 32.50
        // Gross = 282.50
        // 10% discount on 282.50 = 28.25
        // Total = 282.50 - 28.25 = 254.25
        mockMvc.perform(post("/api/v1/warehouse/invoices")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invoiceRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(250.0))
                .andExpect(jsonPath("$.taxTotal").value(32.5))
                .andExpect(jsonPath("$.gross").value(282.5))
                .andExpect(jsonPath("$.discountType").value("PERCENTAGE"))
                .andExpect(jsonPath("$.discountValue").value(10.0))
                .andExpect(jsonPath("$.discountTotal").value(28.25))
                .andExpect(jsonPath("$.total").value(254.25))
                .andExpect(jsonPath("$.taxRate").doesNotExist());
    }
}
