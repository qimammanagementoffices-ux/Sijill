package sa.sijill.api.web.dto;

import java.util.UUID;

public record UpsertRoomRequest(
        String roomNumber,
        String nameAr,
        String nameEn,
        Integer version,
        UUID departmentId,
        UUID custodianId,
        String nameHi) {}
