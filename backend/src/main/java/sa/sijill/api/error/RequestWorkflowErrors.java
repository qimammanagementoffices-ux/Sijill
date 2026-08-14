package sa.sijill.api.error;

import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Refusals from the request workflow, each carrying a stable code the frontend
 * maps to a translated message (dict section {@code requestErrors}). The
 * English text here is the developer-facing fallback and what shows in logs —
 * users never see it once the code has a translation row.
 *
 * Every code added here needs a matching {@code requestErrors.<code>}
 * translation, or the toast falls back to this English string.
 */
public final class RequestWorkflowErrors {

    private RequestWorkflowErrors() {}

    private static ApiException forbidden(String code, String message) {
        return new ApiException(HttpStatus.FORBIDDEN, code, message);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    private static ApiException validation(String code, String message, Map<String, String> fields) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message, fields);
    }

    // --- Who may act ---

    public static ApiException selfReview() {
        return forbidden("SELF_REVIEW", "You cannot review your own request");
    }

    public static ApiException sameOfficial() {
        return forbidden("SAME_OFFICIAL", "The first-level decision was yours — another official must review it");
    }

    public static ApiException decisionOverturned() {
        return forbidden("DECISION_OVERTURNED", "This decision was overturned — another official must take it");
    }

    public static ApiException notRequester() {
        return forbidden("NOT_REQUESTER", "Only the requester can confirm or reject receipt");
    }

    // --- State ---

    public static ApiException wrongStatus(String current) {
        return conflict("WRONG_STATUS", "Request is not in a state that allows this action (current: " + current + ")");
    }

    public static ApiException archived() {
        return conflict("REQUEST_ARCHIVED", "Request is archived");
    }

    public static ApiException alreadyArchived() {
        return conflict("ALREADY_ARCHIVED", "Request is already archived");
    }

    public static ApiException notArchived() {
        return conflict("NOT_ARCHIVED", "Request is not archived");
    }

    public static ApiException editWindowClosed() {
        return conflict("EDIT_WINDOW_CLOSED", "This request can no longer be edited");
    }

    public static ApiException alreadyApproved() {
        return conflict("ALREADY_APPROVED", "This request is already approved at the first level");
    }

    public static ApiException alreadyRejected() {
        return conflict("ALREADY_REJECTED", "This request is already rejected at the first level");
    }

    // --- Input ---

    public static ApiException reasonRequired() {
        return validation("REASON_REQUIRED", "A reason is required", Map.of("comment", "must not be blank"));
    }

    public static ApiException outcomeRequired() {
        return validation("OUTCOME_REQUIRED", "An overturn needs an outcome", Map.of("outcome", "is required"));
    }

    public static ApiException postponeDateRequired() {
        return validation(
                "POSTPONE_DATE_REQUIRED", "A postponement needs a date", Map.of("postponedUntil", "is required"));
    }

    public static ApiException postponeDatePast() {
        return validation(
                "POSTPONE_DATE_PAST",
                "The postponement date must be in the future",
                Map.of("postponedUntil", "must be after today"));
    }

    public static ApiException unknownLine() {
        return validation("UNKNOWN_LINE", "Unknown line", Map.of("lineId", "does not belong to this request"));
    }

    public static ApiException quantityMustBePositive() {
        return validation(
                "QUANTITY_NOT_POSITIVE",
                "An approved quantity must be positive — drop the line instead",
                Map.of("quantity", "must be > 0"));
    }

    public static ApiException noLinesLeft() {
        return validation(
                "NO_LINES_LEFT", "At least one item must remain on the request", Map.of("lines", "cannot all be removed"));
    }

    public static ApiException issuedOutOfRange() {
        return validation(
                "ISSUED_OUT_OF_RANGE",
                "Issued quantity must be between 0 and the approved quantity",
                Map.of("quantityIssued", "out of range"));
    }

    public static ApiException nothingDelivered() {
        return validation(
                "NOTHING_DELIVERED",
                "Record at least one delivered item",
                Map.of("lines", "at least one quantity must be positive"));
    }

    public static ApiException insufficientStock(String itemCode) {
        return validation(
                "INSUFFICIENT_STOCK",
                "Insufficient stock for item " + itemCode,
                Map.of("quantityIssued", "exceeds on-hand quantity"));
    }
}
