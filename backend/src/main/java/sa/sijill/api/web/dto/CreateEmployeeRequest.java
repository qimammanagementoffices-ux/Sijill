package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public record CreateEmployeeRequest(
        String name,
        String phone,
        String pin,
        String pinConfirm,
        String email,
        String nationalId,
        LocalDate joinedDate,
        UUID jobTitleId,
        List<UUID> departmentIds,
        Set<String> permissionKeys,
        UUID photoAttachmentId) {}
