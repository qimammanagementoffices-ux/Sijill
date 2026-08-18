package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.service.AssetTransferService;
import sa.sijill.api.web.dto.AssetDetail;
import sa.sijill.api.web.dto.AssetTransferDto;
import sa.sijill.api.web.dto.TransferAssetRequest;

// Direct admin transfer (relocate/reassign without a formal AssetRequest),
// plus the read-only location-history endpoint used by both this and the
// asset detail view.
@RestController
@RequestMapping("/api/v1/assets/{assetId}/transfers")
public class AssetTransferController {

    private final AssetTransferService assetTransferService;
    private final EmployeeRepository employeeRepository;

    public AssetTransferController(AssetTransferService assetTransferService, EmployeeRepository employeeRepository) {
        this.assetTransferService = assetTransferService;
        this.employeeRepository = employeeRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.manage')")
    public List<AssetTransferDto> history(@PathVariable UUID assetId) {
        return assetTransferService.history(assetId).stream().map(AssetTransferDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('as.manage')")
    public AssetDetail transfer(
            @PathVariable UUID assetId, @RequestBody TransferAssetRequest request, @AuthenticationPrincipal Employee actor) {
        Employee toEmployee = request.toEmployeeId() == null
                ? null
                : employeeRepository
                        .findById(request.toEmployeeId())
                        .orElseThrow(() -> ApiException.notFound("Employee not found"));
        return AssetDetail.from(
                assetTransferService.transfer(assetId, request.toRoomId(), toEmployee, request.reason(), actor));
    }
}
