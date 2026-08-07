package sa.sijill.api.web.dto;

public record UpsertRoomRequest(
        String roomNumber, String nameAr, String nameEn, String building, String floor, Integer version) {}
