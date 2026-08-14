package sa.sijill.api.domain;

// Same two-stage review as NeedRequestStatus, plus master spec §6's extra
// START step -- after final approval the card offers "بدأ التنفيذ", and
// "إنهاء العمل" only once work is under way.
//
//   PENDING/POSTPONED -> APPROVED_UNDER_REVIEW -> APPROVED
//                     -> IN_PROGRESS -> DONE -> CLOSED
//                     -> REJECTED_UNDER_REVIEW -> REJECTED
//
// DONE is the technician reporting the work; CLOSED is the requester
// confirming they accept it.
public enum MaintenanceRequestStatus {
    PENDING,
    APPROVED_UNDER_REVIEW,
    REJECTED_UNDER_REVIEW,
    APPROVED,
    POSTPONED,
    REJECTED,
    IN_PROGRESS,
    DONE,
    CLOSED
}
