package sa.sijill.api.web;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.PurchaseInvoice;
import sa.sijill.api.service.InvoiceService;
import sa.sijill.api.web.dto.CreateInvoiceRequest;
import sa.sijill.api.web.dto.InvoiceDetail;
import sa.sijill.api.web.dto.PagedResponse;

@RestController
@RequestMapping("/api/v1/maintenance/invoices")
public class MaintenanceInvoiceController {

    private final InvoiceService invoiceService;

    public MaintenanceInvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('wh.invoices')")
    public PagedResponse<InvoiceDetail> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @PageableDefault(size = 20, sort = "invoiceDate") Pageable pageable) {
        Page<PurchaseInvoice> page = invoiceService.list(Domain.MAINTENANCE, dateFrom, dateTo, pageable);
        return PagedResponse.from(page, InvoiceDetail::from);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('wh.invoices')")
    public InvoiceDetail get(@PathVariable UUID id) {
        return InvoiceDetail.from(invoiceService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('wh.invoices.edit')")
    public InvoiceDetail post(@RequestBody CreateInvoiceRequest request, @AuthenticationPrincipal Employee actor) {
        return InvoiceDetail.from(invoiceService.post(Domain.MAINTENANCE, request, actor));
    }
}
