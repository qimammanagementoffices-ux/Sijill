package sa.sijill.api.web;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetStatus;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.AttachmentRepository;
import sa.sijill.api.service.AssetService;
import sa.sijill.api.service.QrCodeService;
import sa.sijill.api.web.dto.*;

@RestController
@RequestMapping("/api/v1/assets")
public class AssetController {

    private final AssetService assetService;
    private final AssetRepository assetRepository;
    private final AttachmentRepository attachmentRepository;
    private final QrCodeService qrCodeService;

    public AssetController(AssetService assetService, AssetRepository assetRepository,
                           AttachmentRepository attachmentRepository, QrCodeService qrCodeService) {
        this.assetService = assetService;
        this.assetRepository = assetRepository;
        this.attachmentRepository = attachmentRepository;
        this.qrCodeService = qrCodeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public PagedResponse<AssetListItem> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AssetStatus status,
            @RequestParam(required = false) UUID roomId,
            @RequestParam(required = false) UUID categoryId,
            @PageableDefault(size = 20, sort = "nameEn") Pageable pageable) {
        Page<Asset> page = assetService.search(q, status, roomId, categoryId, pageable);
        List<UUID> ids = page.getContent().stream().map(Asset::getId).toList();
        Map<UUID, String> thumbnails = attachmentRepository
                .findByOwnerTypeAndOwnerIdIn(AttachmentOwnerType.ASSET, ids)
                .stream()
                .collect(Collectors.toMap(
                        Attachment::getOwnerId,
                        Attachment::getUrl,
                        (first, second) -> first));
        return PagedResponse.from(page, a -> AssetListItem.from(a, thumbnails.get(a.getId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public AssetDetail get(@PathVariable UUID id) {
        return AssetDetail.from(assetService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('as.manage')")
    public AssetDetail create(@RequestBody CreateAssetRequest request, @AuthenticationPrincipal Employee actor) {
        return AssetDetail.from(assetService.create(request, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('as.manage')")
    public AssetDetail update(
            @PathVariable UUID id, @RequestBody UpdateAssetRequest request, @AuthenticationPrincipal Employee actor) {
        return AssetDetail.from(assetService.update(id, request, actor));
    }

    @GetMapping("/{id}/qr")
    @PreAuthorize("hasAnyAuthority('as.view', 'as.manage')")
    public ResponseEntity<byte[]> qr(@PathVariable UUID id) {
        Asset asset = assetService.get(id);
        byte[] png = qrCodeService.generateAssetQrPng(asset.getPublicToken(), 400);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("Content-Disposition", "inline; filename=\"" + asset.getAssetNumber() + "-qr.png\"")
                .body(png);
    }

    // Custody report — every currently-active asset assigned to an
    // employee, per master spec §7 "employee-assets custody report."
    @GetMapping("/custody-report/{employeeId}")
    @PreAuthorize("hasAuthority('as.view')")
    public List<AssetListItem> custodyReport(@PathVariable UUID employeeId) {
        return assetRepository.findByCustodianId(employeeId).stream()
                .map(AssetListItem::from)
                .toList();
    }
}
