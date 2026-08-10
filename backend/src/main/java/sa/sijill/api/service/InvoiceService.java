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

        BigDecimal taxRate = request.taxRate() != null ? request.taxRate() : BigDecimal.ZERO;

        PurchaseInvoice invoice = new PurchaseInvoice();
        invoice.setDomain(domain);
        invoice.setInvoiceNumber(request.invoiceNumber());
        invoice.setInvoiceDate(request.invoiceDate() != null ? request.invoiceDate() : java.time.LocalDate.now());
        invoice.setVendor(request.vendor());
        invoice.setTaxRate(taxRate);
        invoice.setCreatedBy(actor);

        BigDecimal subtotal = BigDecimal.ZERO;
        List<PurchaseInvoiceLine> lines = new java.util.ArrayList<>();

        for (InvoiceLineRequest lineRequest : request.lines()) {
            if (lineRequest.quantity() <= 0) {
                throw ApiException.validation("Line quantity must be positive", Map.of("quantity", "must be > 0"));
            }
            InventoryItem item = inventoryItemRepository
                    .findById(lineRequest.inventoryItemId())
                    .orElseThrow(() -> ApiException.validation(
                            "Inventory item not found", Map.of("inventoryItemId", "does not exist")));

            BigDecimal lineTotal = lineRequest.unitPrice().multiply(BigDecimal.valueOf(lineRequest.quantity()));
            subtotal = subtotal.add(lineTotal);

            PurchaseInvoiceLine line = new PurchaseInvoiceLine();
            line.setInvoice(invoice);
            line.setInventoryItem(item);
            line.setQuantity(lineRequest.quantity());
            line.setUnitPrice(lineRequest.unitPrice());
            line.setLineTotal(lineTotal);
            lines.add(line);

            // Stock increment + last-purchase pricing, same transaction (master spec §6).
            item.setQuantity(item.getQuantity() + lineRequest.quantity());
            item.setLastPurchasePrice(lineRequest.unitPrice());
            item.setTaxRate(taxRate);
            BigDecimal taxMultiplier = BigDecimal.ONE.add(taxRate.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
            item.setTaxInclusivePrice(lineRequest.unitPrice().multiply(taxMultiplier).setScale(2, RoundingMode.HALF_UP));
            inventoryItemRepository.save(item);
        }

        BigDecimal taxTotal = subtotal.multiply(taxRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        invoice.setSubtotal(subtotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setTotal(subtotal.add(taxTotal));
        invoice.setLines(lines);

        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);
        auditService.record(actor, "INVOICE_POSTED", "PurchaseInvoice", saved.getId());
        return saved;
    }
}
