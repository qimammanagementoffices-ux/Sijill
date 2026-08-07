package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Room;

public record RoomDto(
        UUID id, String roomNumber, String nameAr, String nameEn, String building, String floor, boolean active, int version) {

    public static RoomDto from(Room room) {
        return new RoomDto(
                room.getId(),
                room.getRoomNumber(),
                room.getNameAr(),
                room.getNameEn(),
                room.getBuilding(),
                room.getFloor(),
                room.isActive(),
                room.getVersion());
    }
}
