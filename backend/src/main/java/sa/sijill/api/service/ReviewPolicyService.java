package sa.sijill.api.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.ReviewPolicy;
import sa.sijill.api.repository.ReviewPolicyRepository;
import sa.sijill.api.web.dto.UpdateReviewPolicyRequest;

/**
 * Whether a first-level decision parks a request for a counter-signature, or
 * settles it outright — chosen per system.
 *
 * Read on every decision, kept as a direct read rather than a cache for the
 * same reason MaintenanceService is: this app's volume does not justify the
 * invalidation problem a cache would bring.
 */
@Service
public class ReviewPolicyService {

    private final ReviewPolicyRepository reviewPolicyRepository;

    public ReviewPolicyService(ReviewPolicyRepository reviewPolicyRepository) {
        this.reviewPolicyRepository = reviewPolicyRepository;
    }

    public ReviewPolicy get() {
        return reviewPolicyRepository.findById(Boolean.TRUE).orElseThrow();
    }

    public boolean warehouseTwoLevel() {
        return get().isWarehouseTwoLevel();
    }

    public boolean maintenanceTwoLevel() {
        return get().isMaintenanceTwoLevel();
    }

    public boolean assetTwoLevel() {
        return get().isAssetTwoLevel();
    }

    @Transactional
    public ReviewPolicy update(UpdateReviewPolicyRequest request) {
        ReviewPolicy policy = get();
        policy.setWarehouseTwoLevel(request.warehouseTwoLevel());
        policy.setMaintenanceTwoLevel(request.maintenanceTwoLevel());
        policy.setAssetTwoLevel(request.assetTwoLevel());
        // Deliberately does NOT touch requests already awaiting a
        // counter-signature. Auto-approving them would let a switch flip grant
        // things no second official ever agreed to; leaving them lets the
        // existing counter-sign and overturn actions settle each one on the
        // terms it was decided under.
        return reviewPolicyRepository.save(policy);
    }
}
