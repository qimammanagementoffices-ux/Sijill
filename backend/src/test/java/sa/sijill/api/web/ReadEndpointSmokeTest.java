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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.AssetStatus;
import sa.sijill.api.domain.MaintenancePriority;
import sa.sijill.api.repository.*;
import sa.sijill.api.web.dto.*;

/**
 * Deliberately NOT @Transactional. Every prior test class in this suite is
 * @Transactional, which wraps the whole test method (including every
 * MockMvc.perform call) in one Hibernate session/transaction — that masks
 * exactly the bug this class exists to catch: entities loaded in one real
 * request-scoped transaction (open-in-view is off, see application.yml)
 * whose LAZY associations get touched later, in a *different* request,
 * during DTO mapping. That threw LazyInitializationException -> 500 on
 * GET /warehouse/invoices in production (see the fix on
 * PurchaseInvoiceLine.inventoryItem and siblings — changed LAZY to EAGER).
 * This test exercises the real per-request transaction boundary.
 *
 * Because nothing here rolls back, this class MUST clean up everything it
 * creates in @AfterEach — onboarding is a use-once-ever operation
 * (needsOnboarding() is just "does any employee exist"), so leaving an
 * employee behind permanently breaks every other test class's
 * createAdminAndGetToken() helper with a 409 instead of 200. This bit us
 * once already; don't remove the cleanup.
 */
class ReadEndpointSmokeTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private NeedRequestRepository needRequestRepository;
    @Autowired private MaintenanceRequestRepository maintenanceRequestRepository;
    @Autowired private AssetTransferRepository assetTransferRepository;
    @Autowired private AssetRequestRepository assetRequestRepository;
    @Autowired private AssetRepository assetRepository;
    @Autowired private PurchaseInvoiceRepository purchaseInvoiceRepository;
    @Autowired private InventoryItemRepository inventoryItemRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private FaultTypeRepository faultTypeRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private JobTitleRepository jobTitleRepository;

    @AfterEach
    @Transactional
    void cleanUp() {
        auditLogRepository.deleteAll();
        needRequestRepository.deleteAll();
        maintenanceRequestRepository.deleteAll();
        assetTransferRepository.deleteAll();
        assetRequestRepository.deleteAll();
        assetRepository.deleteAll();
        purchaseInvoiceRepository.deleteAll();
        inventoryItemRepository.deleteAll();
        faultTypeRepository.deleteAll();
        roomRepository.deleteAll();
        categoryRepository.deleteAll();
        employeeRepository.deleteAll();
        jobTitleRepository.deleteAll();
    }

    @Test
    void listEndpointsRenderNestedAssociationsWithoutLazyInitializationException() throws Exception {
        var onboarding = new FirstAdminRequest("Admin", "0598111111", "1234", "1234");
        String onboardBody = mockMvc.perform(post("/api/v1/onboarding/first-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(onboarding)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String token = objectMapper.readTree(onboardBody).get("token").asText();

        // Employee with a job title (the association that broke first).
        var jobTitle = new UpsertLocalizedEntityRequest("معلم", "Teacher", null, null);
        String jobTitleBody = mockMvc.perform(post("/api/v1/job-titles")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jobTitle)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String jobTitleId = objectMapper.readTree(jobTitleBody).get("id").asText();

        var employee = new CreateEmployeeRequest(
                "Smoke Test Employee", "0598222222", "1234", "1234", null, null, null,
                UUID.fromString(jobTitleId), null, java.util.Set.of(), null);
        String employeeBody = mockMvc.perform(post("/api/v1/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employee)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String employeeId = objectMapper.readTree(employeeBody).get("id").asText();

        mockMvc.perform(get("/api/v1/employees").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/employees/" + employeeId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitle.en").value("Teacher"));

        // Category + item (the association that broke on the warehouse side).
        var category = new UpsertCategoryRequest("قرطاسية", "Stationery", null, null, null);
        String categoryBody = mockMvc.perform(post("/api/v1/warehouse/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(category)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String categoryId = objectMapper.readTree(categoryBody).get("id").asText();

        var item = new CreateInventoryItemRequest(
                "قلم", "Pen", UUID.fromString(categoryId), "box", null, null, 5, null);
        String itemBody = mockMvc.perform(post("/api/v1/warehouse/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(item)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String itemId = objectMapper.readTree(itemBody).get("id").asText();
        String itemCode = objectMapper.readTree(itemBody).get("code").asText();

        mockMvc.perform(get("/api/v1/warehouse/items").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        // Invoice — this is the exact endpoint that 500'd in production.
        var invoice = new CreateInvoiceRequest(
                "SMOKE-INV-1",
                LocalDate.now(),
                "Vendor",
                new BigDecimal("15"),
                List.of(new InvoiceLineRequest(UUID.fromString(itemId), 3, new BigDecimal("2.00"))));
        mockMvc.perform(post("/api/v1/warehouse/invoices")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invoice)));

        mockMvc.perform(get("/api/v1/warehouse/invoices").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].lines[0].itemCode").value(itemCode));

        // Need request — department/category/line-item/action-actor associations.
        var request = new CreateNeedRequestRequest(
                null, null, null, "smoke test", List.of(new NeedRequestLineRequest(UUID.fromString(itemId), 1)));
        String requestBody = mockMvc.perform(post("/api/v1/warehouse/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode created = objectMapper.readTree(requestBody);

        mockMvc.perform(get("/api/v1/warehouse/requests")
                        .param("q", "smoke test")
                        .param("mine", "true")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].requesterName").exists());

        mockMvc.perform(get("/api/v1/warehouse/requests/" + created.get("id").asText())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].itemCode").value(itemCode));

        // --- Maintenance domain (Phase 4) — same LAZY-association risk. ---
        String faultCategoryBody = mockMvc.perform(post("/api/v1/maintenance/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertCategoryRequest("كهرباء", "Electrical", null, null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String faultCategoryId = objectMapper.readTree(faultCategoryBody).get("id").asText();

        String faultTypeBody = mockMvc.perform(post("/api/v1/maintenance/fault-types")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpsertFaultTypeRequest(
                                "عطل كهربائي", "Electrical fault", UUID.fromString(faultCategoryId), null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String faultTypeId = objectMapper.readTree(faultTypeBody).get("id").asText();

        var part = new CreateInventoryItemRequest("قطعة", "Part", null, "pcs", null, null, 0, null);
        String partBody = mockMvc.perform(post("/api/v1/maintenance/parts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(part)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String partId = objectMapper.readTree(partBody).get("id").asText();
        String partCode = objectMapper.readTree(partBody).get("code").asText();

        mockMvc.perform(get("/api/v1/maintenance/parts").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        var maintenanceInvoice = new CreateInvoiceRequest(
                "SMOKE-MINV-1",
                LocalDate.now(),
                "Vendor",
                new BigDecimal("15"),
                List.of(new InvoiceLineRequest(UUID.fromString(partId), 2, new BigDecimal("5.00"))));
        mockMvc.perform(post("/api/v1/maintenance/invoices")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(maintenanceInvoice)));

        mockMvc.perform(get("/api/v1/maintenance/invoices").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].lines[0].itemCode").value(partCode));

        var maintenanceRequest = new SubmitMaintenanceRequestRequest(
                null, UUID.fromString(faultTypeId), "Room 1", MaintenancePriority.MEDIUM, "smoke test fault");
        String maintenanceRequestBody = mockMvc.perform(post("/api/v1/maintenance/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maintenanceRequest)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode createdMaintenanceRequest = objectMapper.readTree(maintenanceRequestBody);

        mockMvc.perform(get("/api/v1/maintenance/requests").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].requesterName").exists())
                .andExpect(jsonPath("$.content[0].faultType.en").value("Electrical fault"));

        mockMvc.perform(get("/api/v1/maintenance/requests/" + createdMaintenanceRequest.get("id").asText())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faultType.en").value("Electrical fault"));

        // --- Assets (Phase 5) — same LAZY-association risk. ---
        String roomBody = mockMvc.perform(post("/api/v1/rooms")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertRoomRequest("SMOKE-101", "قاعة سموك", "Smoke Room", "Main", "1", null, null, null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String roomId = objectMapper.readTree(roomBody).get("id").asText();

        mockMvc.perform(get("/api/v1/rooms").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/rooms")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertRoomRequest("SMOKE-202", "قاعة ثانية", "Second Room", "Annex", "2", null, null, null, null))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/rooms/search")
                        .param("q", "SMOKE")
                        .param("sort", "roomNumber,desc")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].roomNumber").value("SMOKE-202"));

        String assetCategoryBody = mockMvc.perform(post("/api/v1/assets/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpsertCategoryRequest("إلكترونيات", "Electronics", null, null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String assetCategoryId = objectMapper.readTree(assetCategoryBody).get("id").asText();

        String assetBody = mockMvc.perform(post("/api/v1/assets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAssetRequest(
                                "جهاز عرض",
                                "Projector",
                                UUID.fromString(assetCategoryId),
                                UUID.fromString(roomId),
                                null,
                                AssetStatus.ACTIVE,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null, null, null, null))))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode createdAsset = objectMapper.readTree(assetBody);
        String assetId = createdAsset.get("id").asText();
        String publicToken = createdAsset.get("publicToken").asText();
        String assetNumber = createdAsset.get("assetNumber").asText();

        mockMvc.perform(get("/api/v1/assets").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/assets")
                        .param("q", "Projector")
                        .param("categoryId", assetCategoryId)
                        .param("roomId", roomId)
                        .param("status", "ACTIVE")
                        .param("sort", "assetNumber,desc")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(assetId));

        mockMvc.perform(get("/api/v1/assets/" + assetId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category.en").value("Electronics"))
                .andExpect(jsonPath("$.room.en").value("Smoke Room"));

        mockMvc.perform(get("/api/v1/public/assets/" + publicToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetNumber").value(assetNumber));

        var submitAssetRequest = new SubmitAssetRequestRequest(UUID.fromString(assetId), "smoke test");
        String assetRequestBody = mockMvc.perform(post("/api/v1/asset-requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitAssetRequest)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode createdAssetRequest = objectMapper.readTree(assetRequestBody);

        mockMvc.perform(get("/api/v1/asset-requests")
                        .param("q", assetNumber)
                        .param("mine", "true")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].requesterName").exists())
                .andExpect(jsonPath("$.content[0].reason").value("smoke test"))
                .andExpect(jsonPath("$.content[0].actions[0].action").value("SUBMIT"));

        mockMvc.perform(get("/api/v1/asset-requests/" + createdAssetRequest.get("id").asText())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assetNumber").value(assetNumber));

        mockMvc.perform(get("/api/v1/assets/" + assetId + "/transfers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/costs")
                        .param("domain", "warehouse")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").isNumber())
                .andExpect(jsonPath("$.byDepartment").isArray())
                .andExpect(jsonPath("$.byRequester").isArray());

        mockMvc.perform(get("/api/v1/costs")
                        .param("domain", "maintenance")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").isNumber());
    }
}
