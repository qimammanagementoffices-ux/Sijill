package sa.sijill.api.web;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.service.AssetAcquisitionService;
import sa.sijill.api.web.dto.AssetAcquisitionDto;
import sa.sijill.api.web.dto.PagedResponse;
import sa.sijill.api.web.dto.UpsertAssetAcquisitionRequest;

@RestController
@RequestMapping("/api/v1/assets/acquisitions")
public class AssetAcquisitionController {
    private final AssetAcquisitionService service;
    public AssetAcquisitionController(AssetAcquisitionService service) { this.service = service; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.manage')")
    public PagedResponse<AssetAcquisitionDto> list(@RequestParam(required = false) String q,
            @RequestParam(required = false) UUID assetId, @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @PageableDefault(size = 20, sort = "documentDate") Pageable pageable) {
        return PagedResponse.from(service.search(q, assetId, dateFrom, dateTo, pageable), AssetAcquisitionDto::from);
    }

    @GetMapping("/{id}") @PreAuthorize("hasAnyAuthority('as.view', 'as.manage')")
    public AssetAcquisitionDto get(@PathVariable UUID id) { return AssetAcquisitionDto.from(service.get(id)); }

    @PostMapping @PreAuthorize("hasAuthority('as.manage')")
    public AssetAcquisitionDto create(@RequestBody UpsertAssetAcquisitionRequest request,
            @AuthenticationPrincipal Employee actor) { return AssetAcquisitionDto.from(service.create(request, actor)); }

    @PutMapping("/{id}") @PreAuthorize("hasAuthority('as.manage')")
    public AssetAcquisitionDto update(@PathVariable UUID id, @RequestBody UpsertAssetAcquisitionRequest request,
            @AuthenticationPrincipal Employee actor) { return AssetAcquisitionDto.from(service.update(id, request, actor)); }

    @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('as.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal Employee actor) {
        service.delete(id, actor); return ResponseEntity.noContent().build();
    }
}
