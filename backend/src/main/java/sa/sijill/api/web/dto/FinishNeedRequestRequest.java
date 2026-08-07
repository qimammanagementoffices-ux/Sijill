package sa.sijill.api.web.dto;

import java.util.List;
import java.util.UUID;

public record FinishNeedRequestRequest(List<FinishLine> lines) {

    public record FinishLine(UUID lineId, Integer quantityIssued) {}
}
