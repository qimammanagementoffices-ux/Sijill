package sa.sijill.api.web.dto;

import java.util.List;
import java.util.UUID;

// notes is the delivery modal's "ملاحظات" field — recorded on the FINISH
// action so the card shows what the storekeeper wrote.
public record FinishNeedRequestRequest(List<FinishLine> lines, String notes) {

    public record FinishLine(UUID lineId, Integer quantityIssued) {}
}
