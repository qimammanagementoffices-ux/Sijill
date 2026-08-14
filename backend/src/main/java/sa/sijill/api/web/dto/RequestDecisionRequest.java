package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// One shape for every decision modal: an optional comment, the postpone date
// when the decision is a postponement, and the line trims/drops the decider
// made in the same modal.
public record RequestDecisionRequest(String comment, LocalDate postponedUntil, List<DecisionLine> lines) {

    // quantity is the new approved quantity; removed drops the line entirely.
    public record DecisionLine(UUID lineId, Integer quantity, boolean removed) {}

    public List<DecisionLine> linesOrEmpty() {
        return lines == null ? List.of() : lines;
    }
}
