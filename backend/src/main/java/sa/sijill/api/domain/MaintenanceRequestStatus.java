package sa.sijill.api.domain;

// PENDING -> APPROVED/POSTPONED/REJECTED -> IN_PROGRESS (via START) -> CLOSED
// (via FINISH, straight to CLOSED per decision-record.md D3's collapsed
// closure -- master spec §6's extra START step is the only difference
// from NeedRequestStatus).
public enum MaintenanceRequestStatus {
    PENDING,
    APPROVED,
    POSTPONED,
    REJECTED,
    IN_PROGRESS,
    CLOSED
}
