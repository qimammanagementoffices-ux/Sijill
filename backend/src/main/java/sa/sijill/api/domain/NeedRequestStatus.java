package sa.sijill.api.domain;

// PENDING -> APPROVED/POSTPONED/REJECTED -> CLOSED. No separate DONE state
// per decision-record.md D3 (closure collapsed to one fulfiller-driven step).
public enum NeedRequestStatus {
    PENDING,
    APPROVED,
    POSTPONED,
    REJECTED,
    CLOSED
}
