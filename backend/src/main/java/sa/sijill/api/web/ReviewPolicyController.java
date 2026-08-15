package sa.sijill.api.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.ReviewPolicyService;
import sa.sijill.api.web.dto.ReviewPolicyDto;
import sa.sijill.api.web.dto.UpdateReviewPolicyRequest;

@RestController
@RequestMapping("/api/v1/review-policy")
public class ReviewPolicyController {

    private final ReviewPolicyService reviewPolicyService;

    public ReviewPolicyController(ReviewPolicyService reviewPolicyService) {
        this.reviewPolicyService = reviewPolicyService;
    }

    // Readable by any signed-in user: the request screens need it to know
    // whether to offer a counter-signing queue at all. It reveals nothing
    // beyond how decisions are made.
    @GetMapping
    public ReviewPolicyDto get() {
        return ReviewPolicyDto.from(reviewPolicyService.get());
    }

    @PutMapping
    @PreAuthorize("hasAuthority('sys.review.policy')")
    public ReviewPolicyDto update(@RequestBody UpdateReviewPolicyRequest request) {
        return ReviewPolicyDto.from(reviewPolicyService.update(request));
    }
}
