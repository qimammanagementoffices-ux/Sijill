package sa.sijill.api.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.DiscountType;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.domain.PurchaseInvoice;
import sa.sijill.api.domain.PurchaseInvoiceLine;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.InventoryItemRepository;
import sa.sijill.api.repository.PurchaseInvoiceRepository;
import sa.sijill.api.web.dto.CreateInvoiceRequest;
import sa.sijill.api.web.dto.InvoiceLineRequest;

/**
 * Invoices are immutable once posted — no edit/void endpoint in Phase 3a.
 * wh.invoices.edit gates *creating* invoices, wh.invoices gates reading.
 * Reversing a stock increment safely (what "editing" a posted invoice
 * would require) is out of scope for now.
 */
@Service
public class InvoiceService {

    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final AuditService auditService;

    public InvoiceService(
            PurchaseInvoiceRepository purchaseInvoiceRepository,
            InventoryItemRepository inventoryItemRepository,
            AuditService auditService) {
        this.purchaseInvoiceRepository = purchaseInvoiceRepository;
        this.inventoryItemRepository = inventoryItemRepository;
        this.auditService = auditService;
    }

    public Page<PurchaseInvoice> list(Domain domain, Pageable pageable) {
        return purchaseInvoiceRepository.findByDomain(domain, pageable);
    }

    // Null bound = open-ended, so an unfiltered request behaves exactly like
    // the overload above.
    public Page<PurchaseInvoice> list(Domain domain, LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        return purchaseInvoiceRepository.search(domain, dateFrom, dateTo, pageable);
    }

    public PurchaseInvoice get(java.util.UUID id) {
        return purchaseInvoiceRepository.findById(id).orElseThrow(() -> ApiException.notFound("Invoice not found"));
    }

    @Transactional
    public PurchaseInvoice post(Domain domain, CreateInvoiceRequest request, Employee actor) {
        if (request.invoiceNumber() == null || request.invoiceNumber().isBlank()) {
            throw ApiException.validation("Invoice number is required", Map.of("invoiceNumber", "must not be blank"));
        }
        if (purchaseInvoiceRepository.existsByDomainAndInvoiceNumber(domain, request.invoiceNumber())) {
            throw ApiException.conflict("An invoice with this number already exists");
        }
        if (request.lines() == null || request.lines().isEmpty()) {
            throw ApiException.validation("At least one line is required", Map.of("lines", "must not be empty"));
        }

        PurchaseInvoice invoice = new PurchaseInvoice();
        invoice.setDomain(domain);
        invoice.setInvoiceNumber(request.invoiceNumber());
        invoice.setInvoiceDate(request.invoiceDate() != null ? request.invoiceDate() : java.time.LocalDate.now());
        invoice.setVendor(request.vendor());
        invoice.setCreatedBy(actor);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        List<PurchaseInvoiceLine> lines = new java.util.ArrayList<>();

        for (InvoiceLineRequest lineRequest : request.lines()) {
            if (lineRequest.quantity() <= 0) {
                throw ApiException.validation("Line quantity must be positive", Map.of("quantity", "must be > 0"));
            }
            if (lineRequest.unitPrice() == null || lineRequest.unitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw ApiException.validation("Unit price must be non-negative", Map.of("unitPrice", "must be >= 0"));
            }

            // Normalize unit price to scale 2 HALF_UP before calculation and persistence
            BigDecimal unitPrice = lineRequest.unitPrice().setScale(2, RoundingMode.HALF_UP);

            BigDecimal rawLineTaxRate = lineRequest.taxRate() != null
                    ? lineRequest.taxRate()
                    : (request.taxRate() != null ? request.taxRate() : BigDecimal.ZERO);

            if (rawLineTaxRate.compareTo(BigDecimal.ZERO) < 0 || rawLineTaxRate.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw ApiException.validation("Tax rate must be between 0 and 100", Map.of("taxRate", "must be between 0 and 100"));
            }
            // Normalize tax rate to scale 2 HALF_UP before calculation and persistence
            BigDecimal lineTaxRate = rawLineTaxRate.setScale(2, RoundingMode.HALF_UP);

            InventoryItem item = inventoryItemRepository
                    .findById(lineRequest.inventoryItemId())
                    .orElseThrow(() -> ApiException.validation(
                            "Inventory item not found", Map.of("inventoryItemId", "does not exist")));

            BigDecimal preTax = unitPrice
                    .multiply(BigDecimal.valueOf(lineRequest.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTax = preTax.multiply(lineTaxRate)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            subtotal = subtotal.add(preTax);
            taxTotal = taxTotal.add(lineTax);

            PurchaseInvoiceLine line = new PurchaseInvoiceLine();
            line.setInvoice(invoice);
            line.setInventoryItem(item);
            line.setQuantity(lineRequest.quantity());
            line.setUnitPrice(unitPrice);
            line.setTaxRate(lineTaxRate);
            line.setLineTotal(preTax);
            lines.add(line);

            // Stock increment + last-purchase pricing using normalized unit price and line's own tax rate
            item.setQuantity(item.getQuantity() + lineRequest.quantity());
            item.setLastPurchasePrice(unitPrice);
            item.setTaxRate(lineTaxRate);
            BigDecimal taxMultiplier = BigDecimal.ONE.add(lineTaxRate.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
            item.setTaxInclusivePrice(unitPrice.multiply(taxMultiplier).setScale(2, RoundingMode.HALF_UP));
            inventoryItemRepository.save(item);
        }

        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        taxTotal = taxTotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal gross = subtotal.add(taxTotal);

        DiscountType discountType = request.discountType() != null ? request.discountType() : DiscountType.FIXED;
        BigDecimal rawDiscountValue = request.discountValue() != null ? request.discountValue() : BigDecimal.ZERO;

        if (rawDiscountValue.compareTo(BigDecimal.ZERO) < 0) {
            throw ApiException.validation("Discount value must be non-negative", Map.of("discountValue", "must be >= 0"));
        }
        if (discountType == DiscountType.PERCENTAGE && rawDiscountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw ApiException.validation("Percentage discount cannot exceed 100", Map.of("discountValue", "must be between 0 and 100"));
        }

        // Normalize discount value to scale 2 HALF_UP before calculation and persistence
        BigDecimal discountValue = rawDiscountValue.setScale(2, RoundingMode.HALF_UP);

        BigDecimal computedDiscount;
        if (discountType == DiscountType.PERCENTAGE) {
            computedDiscount = gross.multiply(discountValue).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            computedDiscount = discountValue;
        }

        if (computedDiscount.compareTo(gross) > 0) {
            throw ApiException.validation("Discount cannot exceed gross amount", Map.of("discount", "cannot exceed gross"));
        }

        BigDecimal finalTotal = gross.subtract(computedDiscount).setScale(2, RoundingMode.HALF_UP);
        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            throw ApiException.validation("Final total cannot be negative", Map.of("total", "cannot be negative"));
        }

        BigDecimal firstRate = lines.get(0).getTaxRate();
        boolean uniformTax = lines.stream().allMatch(l -> l.getTaxRate().compareTo(firstRate) == 0);
        BigDecimal invoiceTaxRate = uniformTax ? firstRate : null;

        invoice.setTaxRate(invoiceTaxRate);
        invoice.setSubtotal(subtotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setDiscountType(discountType);
        invoice.setDiscountValue(discountValue);
        invoice.setDiscountTotal(computedDiscount);
        invoice.setTotal(finalTotal);
        invoice.setLines(lines);

        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);
        auditService.record(actor, "INVOICE_POSTED", "PurchaseInvoice", saved.getId());
        return saved;
    }
}
