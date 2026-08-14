package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.List;

// The senior official overturning a first-level decision picks what the
// request becomes instead. APPROVE is only reachable from a rejection and
// REJECT only from an approval -- the service enforces that pairing.
public record OverturnRequest(
        Outcome outcome, String comment, LocalDate postponedUntil, List<RequestDecisionRequest.DecisionLine> lines) {

    public enum Outcome {
        APPROVE,
        REJECT,
        POSTPONE
    }

    public RequestDecisionRequest asDecision() {
        return new RequestDecisionRequest(comment, postponedUntil, lines);
    }
}
