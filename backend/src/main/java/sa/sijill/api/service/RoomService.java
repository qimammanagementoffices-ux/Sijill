package sa.sijill.api.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Room;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.DepartmentRepository;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.repository.RoomRepository;
import sa.sijill.api.web.dto.RoomDto;
import sa.sijill.api.web.dto.UpsertRoomRequest;

// No delete — same reference-data caution as StructureService/CategoryService.
@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final AssetRepository assetRepository;

    public RoomService(
            RoomRepository roomRepository,
            DepartmentRepository departmentRepository,
            EmployeeRepository employeeRepository,
            AssetRepository assetRepository) {
        this.roomRepository = roomRepository;
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
        this.assetRepository = assetRepository;
    }

    public List<Room> list() {
        return roomRepository.findAll();
    }

    public Room get(UUID id) {
        return roomRepository.findById(id).orElseThrow(() -> ApiException.notFound("Room not found"));
    }

    @Transactional
    public Room create(UpsertRoomRequest request) {
        validate(request);
        Room room = new Room();
        room.setRoomNumber(request.roomNumber());
        room.setNameAr(request.nameAr());
        room.setNameEn(request.nameEn());
        room.setBuilding(request.building());
        room.setFloor(request.floor());
        room.setDepartment(resolveDepartment(request.departmentId()));
        room.setCustodian(resolveEmployee(request.custodianId()));
        return roomRepository.save(room);
    }

    @Transactional
    public Room update(UUID id, UpsertRoomRequest request) {
        validate(request);
        Room room = get(id);
        if (request.version() == null || !request.version().equals(room.getVersion())) {
            throw new StaleVersionException(RoomDto.from(room, assetRepository.countByRoom_Id(room.getId())));
        }
        room.setRoomNumber(request.roomNumber());
        room.setNameAr(request.nameAr());
        room.setNameEn(request.nameEn());
        room.setBuilding(request.building());
        room.setFloor(request.floor());
        room.setDepartment(resolveDepartment(request.departmentId()));
        room.setCustodian(resolveEmployee(request.custodianId()));
        return roomRepository.save(room);
    }

    @Transactional
    public void deactivate(UUID id) {
        Room room = get(id);
        room.setActive(false);
        roomRepository.save(room);
    }

    private void validate(UpsertRoomRequest request) {
        if (request.roomNumber() == null || request.roomNumber().isBlank()) {
            throw ApiException.validation("Room number is required", Map.of("roomNumber", "must not be blank"));
        }
        if (request.nameAr() == null || request.nameAr().isBlank()) {
            throw ApiException.validation("Arabic name is required", Map.of("nameAr", "must not be blank"));
        }
        if (request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("English name is required", Map.of("nameEn", "must not be blank"));
        }
    }

    private Department resolveDepartment(UUID id) {
        if (id == null) return null;
        return departmentRepository.findById(id).orElseThrow(() -> ApiException.validation(
                "Department not found", Map.of("departmentId", "does not exist")));
    }

    private Employee resolveEmployee(UUID id) {
        if (id == null) return null;
        return employeeRepository.findById(id).orElseThrow(() -> ApiException.validation(
                "Employee not found", Map.of("custodianId", "does not exist")));
    }
}
