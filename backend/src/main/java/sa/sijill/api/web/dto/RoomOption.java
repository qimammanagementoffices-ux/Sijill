package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Room;

/** Minimum room data needed by maintenance and asset request forms. */
public record RoomOption(
        UUID id,
        String roomNumber,
        String nameAr,
        String nameEn,
        String nameHi,
        UUID departmentId,
        String departmentNameAr,
        String departmentNameEn,
        boolean active) {

    public static RoomOption from(Room room) {
        LocalizedRef department = room.getDepartment() == null ? null : LocalizedRef.from(room.getDepartment());
        return new RoomOption(
                room.getId(),
                room.getRoomNumber(),
                room.getNameAr(),
                room.getNameEn(),
                room.getNameHi(),
                room.getDepartment() == null ? null : room.getDepartment().getId(),
                department == null ? null : department.ar(),
                department == null ? null : department.en(),
                room.isActive());
    }
}
