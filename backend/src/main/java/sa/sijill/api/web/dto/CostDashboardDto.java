package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record CostDashboardDto(
        BigDecimal total,
        List<CostBreakdownRow> byDepartment,
        List<CostBreakdownRow> byRequester) {}
