package sa.sijill.api.web.dto;

import sa.sijill.api.domain.ReviewPolicy;

public record ReviewPolicyDto(
        boolean warehouseTwoLevel, boolean maintenanceTwoLevel, boolean assetTwoLevel) {

    public static ReviewPolicyDto from(ReviewPolicy policy) {
        return new ReviewPolicyDto(
                policy.isWarehouseTwoLevel(), policy.isMaintenanceTwoLevel(), policy.isAssetTwoLevel());
    }
}
