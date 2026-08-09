package sa.sijill.api.web.dto;

import java.util.UUID;

public record UpsertRoomRequest(
        String roomNumber,
        String nameAr,
        String nameEn,
        String building,
        String floor,
        Integer version,
        UUID departmentId,
        UUID custodianId) {}
