package sa.sijill.api.web.dto;

import java.util.List;
import java.util.UUID;

public record CreateNeedRequestRequest(
        UUID departmentId, UUID categoryId, String notes, List<NeedRequestLineRequest> lines) {}
