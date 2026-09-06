package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import sa.sijill.api.domain.DiscountType;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.domain.PurchaseInvoice;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.InventoryItemRepository;
import sa.sijill.api.repository.PurchaseInvoiceRepository;
import sa.sijill.api.web.dto.CreateInvoiceRequest;
import sa.sijill.api.web.dto.InvoiceLineRequest;

class InvoiceServiceTest {

    private PurchaseInvoiceRepository purchaseInvoiceRepository;
    private InventoryItemRepository inventoryItemRepository;
    private AuditService auditService;
    private InvoiceService invoiceService;
    private Employee actor;

    @BeforeEach
    void setUp() {
        purchaseInvoiceRepository = mock(PurchaseInvoiceRepository.class);
        inventoryItemRepository = mock(InventoryItemRepository.class);
        auditService = mock(AuditService.class);
        invoiceService = new InvoiceService(purchaseInvoiceRepository, inventoryItemRepository, auditService);

        actor = new Employee();
        actor.setId(UUID.randomUUID());

        when(purchaseInvoiceRepository.existsByDomainAndInvoiceNumber(any(), any())).thenReturn(false);
        when(purchaseInvoiceRepository.save(any(PurchaseInvoice.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private InventoryItem createMockItem(UUID id, int initialQty, BigDecimal initialPrice) {
        InventoryItem item = new InventoryItem();
        item.setId(id);
        item.setQuantity(initialQty);
        item.setLastPurchasePrice(initialPrice);
        return item;
    }

    @Test
    void mixedPerLineTaxCalculatesCorrectlyAndClearsInvoiceTaxRate() {
        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        InventoryItem item1 = createMockItem(itemId1, 10, new BigDecimal("50.00"));
        InventoryItem item2 = createMockItem(itemId2, 5, new BigDecimal("20.00"));

        when(inventoryItemRepository.findById(itemId1)).thenReturn(Optional.of(item1));
        when(inventoryItemRepository.findById(itemId2)).thenReturn(Optional.of(item2));

        // Line 1: 2 * 100.00 = 200.00 pre-tax, 15% tax = 30.00 tax
        // Line 2: 1 * 50.00 = 50.00 pre-tax, 5% tax = 2.50 tax
        var lines = List.of(
                new InvoiceLineRequest(itemId1, 2, new BigDecimal("100.00"), new BigDecimal("15")),
                new InvoiceLineRequest(itemId2, 1, new BigDecimal("50.00"), new BigDecimal("5"))
        );
        var request = new CreateInvoiceRequest(
                "INV-MIXED", LocalDate.now(), "Mixed Vendor", null, DiscountType.FIXED, BigDecimal.ZERO, lines);

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        // Subtotal = 200 + 50 = 250.00
        assertThat(invoice.getSubtotal()).isEqualByComparingTo("250.00");
        // Tax total = 30 + 2.50 = 32.50
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("32.50");
        // Total = 282.50
        assertThat(invoice.getTotal()).isEqualByComparingTo("282.50");
        // Mixed rates means invoice-level taxRate should be null to not mislead
        assertThat(invoice.getTaxRate()).isNull();

        // Check line persistence
        assertThat(invoice.getLines()).hasSize(2);
        assertThat(invoice.getLines().get(0).getTaxRate()).isEqualByComparingTo("15");
        assertThat(invoice.getLines().get(0).getLineTotal()).isEqualByComparingTo("200.00");
        assertThat(invoice.getLines().get(1).getTaxRate()).isEqualByComparingTo("5");
        assertThat(invoice.getLines().get(1).getLineTotal()).isEqualByComparingTo("50.00");
    }

    @Test
    void fixedDiscountSubtractsFromGross() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // 2 * 100 = 200 pre-tax, 15% tax = 30 -> gross = 230
        var lines = List.of(new InvoiceLineRequest(itemId, 2, new BigDecimal("100.00"), new BigDecimal("15")));
        // Fixed discount of 25.00
        var request = new CreateInvoiceRequest(
                "INV-FIXED-DISC", LocalDate.now(), "Vendor", null, DiscountType.FIXED, new BigDecimal("25.00"), lines);

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        assertThat(invoice.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("30.00");
        assertThat(invoice.getDiscountType()).isEqualTo(DiscountType.FIXED);
        assertThat(invoice.getDiscountValue()).isEqualByComparingTo("25.00");
        assertThat(invoice.getDiscountTotal()).isEqualByComparingTo("25.00");
        // Final total = gross (230) - discount (25) = 205.00
        assertThat(invoice.getTotal()).isEqualByComparingTo("205.00");
    }

    @Test
    void percentageDiscountCalculatesFromGross() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // 2 * 100 = 200 pre-tax, 15% tax = 30 -> gross = 230
        var lines = List.of(new InvoiceLineRequest(itemId, 2, new BigDecimal("100.00"), new BigDecimal("15")));
        // 10% discount on gross 230.00 = 23.00
        var request = new CreateInvoiceRequest(
                "INV-PCT-DISC", LocalDate.now(), "Vendor", null, DiscountType.PERCENTAGE, new BigDecimal("10"), lines);

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        assertThat(invoice.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("30.00");
        assertThat(invoice.getDiscountType()).isEqualTo(DiscountType.PERCENTAGE);
        assertThat(invoice.getDiscountValue()).isEqualByComparingTo("10.00");
        assertThat(invoice.getDiscountTotal()).isEqualByComparingTo("23.00");
        // Final total = 230 - 23 = 207.00
        assertThat(invoice.getTotal()).isEqualByComparingTo("207.00");
    }

    @Test
    void defaultsAndBackwardCompatibility() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // Legacy 5-arg constructor: invoice-level taxRate 15%, line has null taxRate
        var lines = List.of(new InvoiceLineRequest(itemId, 2, new BigDecimal("50.00")));
        var request = new CreateInvoiceRequest("INV-LEGACY", LocalDate.now(), "Vendor", new BigDecimal("15"), lines);

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        // Pre-tax: 2 * 50 = 100.00
        assertThat(invoice.getSubtotal()).isEqualByComparingTo("100.00");
        // Line inherited invoice tax rate 15% -> 15.00 tax
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("15.00");
        // Since all lines have 15%, invoice taxRate is retained as 15.00
        assertThat(invoice.getTaxRate()).isEqualByComparingTo("15.00");
        // Discount defaults to FIXED / 0
        assertThat(invoice.getDiscountType()).isEqualTo(DiscountType.FIXED);
        assertThat(invoice.getDiscountValue()).isEqualByComparingTo("0.00");
        assertThat(invoice.getDiscountTotal()).isEqualByComparingTo("0.00");
        assertThat(invoice.getTotal()).isEqualByComparingTo("115.00");
    }

    @Test
    void omittedLineTaxDefaultsToZero() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // No invoice taxRate, no line taxRate
        var lines = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("40.00")));
        var request = new CreateInvoiceRequest(
                "INV-NO-TAX", LocalDate.now(), "Vendor", null, null, null, lines);

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        assertThat(invoice.getSubtotal()).isEqualByComparingTo("40.00");
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("0.00");
        assertThat(invoice.getTaxRate()).isEqualByComparingTo("0.00");
        assertThat(invoice.getTotal()).isEqualByComparingTo("40.00");
        assertThat(invoice.getLines().get(0).getTaxRate()).isEqualByComparingTo("0.00");
    }

    @Test
    void invalidRangesAreRejected() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // Negative tax rate
        assertThatThrownBy(() -> {
            var lines = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("10.00"), new BigDecimal("-5")));
            var req = new CreateInvoiceRequest("INV-ERR", LocalDate.now(), "Vendor", null, DiscountType.FIXED, BigDecimal.ZERO, lines);
            invoiceService.post(Domain.WAREHOUSE, req, actor);
        }).isInstanceOf(ApiException.class).hasMessageContaining("Tax rate");

        // Tax rate > 100
        assertThatThrownBy(() -> {
            var lines = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("10.00"), new BigDecimal("105")));
            var req = new CreateInvoiceRequest("INV-ERR", LocalDate.now(), "Vendor", null, DiscountType.FIXED, BigDecimal.ZERO, lines);
            invoiceService.post(Domain.WAREHOUSE, req, actor);
        }).isInstanceOf(ApiException.class).hasMessageContaining("Tax rate");

        // Negative fixed discount
        assertThatThrownBy(() -> {
            var lines = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("10.00"), BigDecimal.ZERO));
            var req = new CreateInvoiceRequest("INV-ERR", LocalDate.now(), "Vendor", null, DiscountType.FIXED, new BigDecimal("-1.00"), lines);
            invoiceService.post(Domain.WAREHOUSE, req, actor);
        }).isInstanceOf(ApiException.class).hasMessageContaining("Discount");

        // Percentage discount > 100
        assertThatThrownBy(() -> {
            var lines = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("10.00"), BigDecimal.ZERO));
            var req = new CreateInvoiceRequest("INV-ERR", LocalDate.now(), "Vendor", null, DiscountType.PERCENTAGE, new BigDecimal("101"), lines);
            invoiceService.post(Domain.WAREHOUSE, req, actor);
        }).isInstanceOf(ApiException.class).hasMessageContaining("Percentage discount");

        // Fixed discount > gross amount
        assertThatThrownBy(() -> {
            // Gross is 10.00, discount is 20.00
            var lines = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("10.00"), BigDecimal.ZERO));
            var req = new CreateInvoiceRequest("INV-ERR", LocalDate.now(), "Vendor", null, DiscountType.FIXED, new BigDecimal("20.00"), lines);
            invoiceService.post(Domain.WAREHOUSE, req, actor);
        }).isInstanceOf(ApiException.class).hasMessageContaining("Discount cannot exceed gross");
    }

    @Test
    void perItemTaxInclusivePricingUpdatesFromEachLineTaxRate() {
        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        InventoryItem item1 = createMockItem(itemId1, 5, new BigDecimal("10.00"));
        InventoryItem item2 = createMockItem(itemId2, 2, new BigDecimal("50.00"));

        when(inventoryItemRepository.findById(itemId1)).thenReturn(Optional.of(item1));
        when(inventoryItemRepository.findById(itemId2)).thenReturn(Optional.of(item2));

        // Line 1: unitPrice 100.00, tax 15% -> taxMultiplier = 1.15 -> taxInclusivePrice = 115.00
        // Line 2: unitPrice 50.00, tax 5% -> taxMultiplier = 1.05 -> taxInclusivePrice = 52.50
        var lines = List.of(
                new InvoiceLineRequest(itemId1, 3, new BigDecimal("100.00"), new BigDecimal("15")),
                new InvoiceLineRequest(itemId2, 4, new BigDecimal("50.00"), new BigDecimal("5"))
        );
        var request = new CreateInvoiceRequest("INV-ITEMS", LocalDate.now(), "Vendor", null, DiscountType.FIXED, BigDecimal.ZERO, lines);

        invoiceService.post(Domain.WAREHOUSE, request, actor);

        // Verify item1
        assertThat(item1.getQuantity()).isEqualTo(5 + 3);
        assertThat(item1.getLastPurchasePrice()).isEqualByComparingTo("100.00");
        assertThat(item1.getTaxRate()).isEqualByComparingTo("15.00");
        assertThat(item1.getTaxInclusivePrice()).isEqualByComparingTo("115.00");

        // Verify item2
        assertThat(item2.getQuantity()).isEqualTo(2 + 4);
        assertThat(item2.getLastPurchasePrice()).isEqualByComparingTo("50.00");
        assertThat(item2.getTaxRate()).isEqualByComparingTo("5.00");
        assertThat(item2.getTaxInclusivePrice()).isEqualByComparingTo("52.50");
    }

    @Test
    void monetaryTotalsRoundHalfUp() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // 3 * 10.33 = 30.99
        // 15% tax on 30.99 = 4.6485 -> rounds to 4.65 HALF_UP
        // Gross = 30.99 + 4.65 = 35.64
        // Percentage discount 7% on 35.64 = 2.4948 -> rounds to 2.49 HALF_UP
        // Final total = 35.64 - 2.49 = 33.15
        var lines = List.of(new InvoiceLineRequest(itemId, 3, new BigDecimal("10.33"), new BigDecimal("15")));
        var request = new CreateInvoiceRequest("INV-ROUND", LocalDate.now(), "Vendor", null, DiscountType.PERCENTAGE, new BigDecimal("7"), lines);

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        assertThat(invoice.getSubtotal()).isEqualByComparingTo("30.99");
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("4.65");
        assertThat(invoice.getDiscountTotal()).isEqualByComparingTo("2.49");
        assertThat(invoice.getTotal()).isEqualByComparingTo("33.15");
    }

    @Test
    void scaleGreaterThanTwoTaxRateAndDiscountAreNormalizedHalfUpBeforeCalculationAndPersistence() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // Tax rate 1.235 rounds to 1.24 HALF_UP
        // Discount value 1.235 rounds to 1.24 HALF_UP
        // Line: qty 1, unitPrice 100.00 -> preTax = 100.00
        // Line tax calculated with 1.24: 100.00 * 1.24 / 100 = 1.24
        // Subtotal = 100.00, Tax Total = 1.24, Gross = 101.24
        // Fixed discount: normalized value = 1.24, discountTotal = 1.24
        // Final Total = 101.24 - 1.24 = 100.00
        var lines = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("100.00"), new BigDecimal("1.235")));
        var request = new CreateInvoiceRequest(
                "INV-NORM-SCALE",
                LocalDate.now(),
                "Vendor",
                null,
                DiscountType.FIXED,
                new BigDecimal("1.235"),
                lines
        );

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        // Verify stored line tax rate is exactly 1.24
        assertThat(invoice.getLines().get(0).getTaxRate()).isEqualByComparingTo("1.24");
        // Verify inventory item last purchase tax rate is 1.24
        assertThat(item.getTaxRate()).isEqualByComparingTo("1.24");

        // Verify invoice totals and discount agree with 1.24
        assertThat(invoice.getSubtotal()).isEqualByComparingTo("100.00");
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("1.24");
        assertThat(invoice.getDiscountValue()).isEqualByComparingTo("1.24");
        assertThat(invoice.getDiscountTotal()).isEqualByComparingTo("1.24");
        assertThat(invoice.getTotal()).isEqualByComparingTo("100.00");

        // Also test percentage discount normalization with >2 decimals
        // Item: qty 1, unitPrice 200.00, tax 0 -> gross = 200.00
        // Percentage discount 2.505% rounds to 2.51%
        // Computed discount: 200.00 * 2.51 / 100 = 5.02
        // Total = 200.00 - 5.02 = 194.98
        InventoryItem item2 = createMockItem(itemId, 0, BigDecimal.ZERO);
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item2));

        var lines2 = List.of(new InvoiceLineRequest(itemId, 1, new BigDecimal("200.00"), BigDecimal.ZERO));
        var request2 = new CreateInvoiceRequest(
                "INV-NORM-PCT",
                LocalDate.now(),
                "Vendor",
                null,
                DiscountType.PERCENTAGE,
                new BigDecimal("2.505"),
                lines2
        );

        PurchaseInvoice invoice2 = invoiceService.post(Domain.WAREHOUSE, request2, actor);

        assertThat(invoice2.getDiscountValue()).isEqualByComparingTo("2.51");
        assertThat(invoice2.getDiscountTotal()).isEqualByComparingTo("5.02");
        assertThat(invoice2.getTotal()).isEqualByComparingTo("194.98");
    }

    @Test
    void scaleGreaterThanTwoUnitPriceIsNormalizedHalfUpBeforeCalculationAndPersistence() {
        UUID itemId = UUID.randomUUID();
        InventoryItem item = createMockItem(itemId, 5, new BigDecimal("10.00"));
        when(inventoryItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        // unitPrice: 12.345 rounds to 12.35 HALF_UP
        // quantity: 3 -> preTax = 3 * 12.35 = 37.05
        // taxRate: 15% -> lineTax = 37.05 * 0.15 = 5.5575 -> 5.56
        // gross = 37.05 + 5.56 = 42.61
        // discount: 0
        // total = 42.61
        // item lastPurchasePrice = 12.35
        // item taxRate = 15.00
        // item taxInclusivePrice = 12.35 * 1.15 = 14.2025 -> 14.20
        var lines = List.of(new InvoiceLineRequest(itemId, 3, new BigDecimal("12.345"), new BigDecimal("15")));
        var request = new CreateInvoiceRequest(
                "INV-NORM-UNIT-PRICE",
                LocalDate.now(),
                "Vendor",
                null,
                DiscountType.FIXED,
                BigDecimal.ZERO,
                lines
        );

        PurchaseInvoice invoice = invoiceService.post(Domain.WAREHOUSE, request, actor);

        // 1. Stored line unit price must be normalized to 12.35
        assertThat(invoice.getLines().get(0).getUnitPrice()).isEqualByComparingTo("12.35");
        // 2. Line total must agree with normalized unit price: 3 * 12.35 = 37.05
        assertThat(invoice.getLines().get(0).getLineTotal()).isEqualByComparingTo("37.05");

        // 3. Invoice totals must agree with normalized values
        assertThat(invoice.getSubtotal()).isEqualByComparingTo("37.05");
        assertThat(invoice.getTaxTotal()).isEqualByComparingTo("5.56");
        assertThat(invoice.getTotal()).isEqualByComparingTo("42.61");

        // 4. Inventory item last-purchase values must agree with normalized unit price
        assertThat(item.getLastPurchasePrice()).isEqualByComparingTo("12.35");
        assertThat(item.getTaxRate()).isEqualByComparingTo("15.00");
        assertThat(item.getTaxInclusivePrice()).isEqualByComparingTo("14.20");
        assertThat(item.getQuantity()).isEqualTo(8);
    }
}
