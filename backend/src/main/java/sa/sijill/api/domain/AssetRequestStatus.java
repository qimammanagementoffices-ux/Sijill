package sa.sijill.api.domain;

// Same two-stage review as NeedRequestStatus. No DELIVERED/receipt step here:
// fulfilling an asset request performs a custody transfer, which is already
// its own audited record naming the receiving employee -- a second
// "confirm receipt" would be the same fact twice, and rejecting it would mean
// reversing a transfer.
public enum AssetRequestStatus {
    PENDING,
    APPROVED_UNDER_REVIEW,
    REJECTED_UNDER_REVIEW,
    APPROVED,
    POSTPONED,
    REJECTED,
    CLOSED
}
