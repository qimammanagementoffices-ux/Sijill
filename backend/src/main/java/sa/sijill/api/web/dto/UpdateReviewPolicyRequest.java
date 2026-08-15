package sa.sijill.api.web.dto;

public record UpdateReviewPolicyRequest(
        boolean warehouseTwoLevel, boolean maintenanceTwoLevel, boolean assetTwoLevel) {}
