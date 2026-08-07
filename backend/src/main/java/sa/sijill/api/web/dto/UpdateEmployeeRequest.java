package sa.sijill.api.web.dto;

import java.util.List;
import java.util.UUID;

public record UpdateEmployeeRequest(
        String name,
        String phone,
        String email,
        String nationalId,
        UUID jobTitleId,
        List<UUID> departmentIds,
        int version) {}
