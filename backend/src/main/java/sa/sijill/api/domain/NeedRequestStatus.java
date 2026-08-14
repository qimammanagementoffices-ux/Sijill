package sa.sijill.api.domain;

// Two-stage review (docs/need-request-workflow.md): a first-level decision
// parks the request in *_UNDER_REVIEW until a second, different official
// counter-signs it. Only a counter-signed APPROVED can be delivered.
//
//   PENDING/POSTPONED -> APPROVED_UNDER_REVIEW -> APPROVED -> DELIVERED -> CLOSED
//                     -> REJECTED_UNDER_REVIEW -> REJECTED
//
// Supersedes decision-record D3's collapsed closure: DELIVERED is the
// storekeeper's hand-over, CLOSED is the requester confirming receipt.
public enum NeedRequestStatus {
    PENDING,
    APPROVED_UNDER_REVIEW,
    REJECTED_UNDER_REVIEW,
    APPROVED,
    POSTPONED,
    REJECTED,
    DELIVERED,
    CLOSED
}
