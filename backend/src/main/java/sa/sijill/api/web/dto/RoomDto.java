package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Room;

public record RoomDto(
        UUID id,
        String roomNumber,
        String nameAr,
        String nameEn,
        String nameHi,
        String building,
        String floor,
        UUID departmentId,
        String departmentNameAr,
        String departmentNameEn,
        UUID custodianId,
        String custodianName,
        boolean active,
        int version,
        long assetCount) {

    public static RoomDto from(Room room, long assetCount) {
        return new RoomDto(
                room.getId(),
                room.getRoomNumber(),
                room.getNameAr(),
                room.getNameEn(),
                room.getNameHi(),
                room.getBuilding(),
                room.getFloor(),
                room.getDepartment() == null ? null : room.getDepartment().getId(),
                room.getDepartment() == null ? null : room.getDepartment().getNameAr(),
                room.getDepartment() == null ? null : room.getDepartment().getNameEn(),
                room.getCustodian() == null ? null : room.getCustodian().getId(),
                room.getCustodian() == null ? null : room.getCustodian().getName(),
                room.isActive(),
                room.getVersion(),
                assetCount);
    }
}
