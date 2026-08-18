package sa.sijill.api.web;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Room;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.RoomAssetCount;
import sa.sijill.api.service.RoomService;
import sa.sijill.api.web.dto.RoomDto;
import sa.sijill.api.web.dto.RoomOption;
import sa.sijill.api.web.dto.PagedResponse;
import sa.sijill.api.web.dto.UpsertRoomRequest;

@RestController
@RequestMapping("/api/v1/rooms")
public class RoomController {

    private final RoomService roomService;
    private final AssetRepository assetRepository;

    public RoomController(RoomService roomService, AssetRepository assetRepository) {
        this.roomService = roomService;
        this.assetRepository = assetRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.manage')")
    public List<RoomDto> list() {
        Map<UUID, Long> counts = assetRepository.countAssetsByRoom().stream()
                .collect(Collectors.toMap(RoomAssetCount::getRoomId, RoomAssetCount::getCount));
        List<Room> rooms = roomService.list();
        return rooms.stream()
                .map(room -> RoomDto.from(room, counts.getOrDefault(room.getId(), 0L)))
                .toList();
    }

    @GetMapping("/options")
    @PreAuthorize("hasAnyAuthority('as.request', 'mt.request')")
    public List<RoomOption> options() {
        return roomService.list().stream().map(RoomOption::from).toList();
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('as.view', 'as.manage')")
    public PagedResponse<RoomDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID departmentId,
            @PageableDefault(size = 20, sort = "roomNumber") Pageable pageable) {
        Page<Room> page = roomService.search(q, departmentId, pageable);
        Map<UUID, Long> counts = assetRepository.countAssetsByRoom().stream()
                .collect(Collectors.toMap(RoomAssetCount::getRoomId, RoomAssetCount::getCount));
        return PagedResponse.from(page, room -> RoomDto.from(room, counts.getOrDefault(room.getId(), 0L)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('as.view', 'as.manage')")
    public RoomDto get(@PathVariable UUID id) {
        Room room = roomService.get(id);
        return RoomDto.from(room, assetRepository.countByRoom_Id(room.getId()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('as.manage')")
    public RoomDto create(@RequestBody UpsertRoomRequest request) {
        return RoomDto.from(roomService.create(request), 0);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('as.manage')")
    public RoomDto update(@PathVariable UUID id, @RequestBody UpsertRoomRequest request) {
        Room room = roomService.update(id, request);
        return RoomDto.from(room, assetRepository.countByRoom_Id(room.getId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('as.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roomService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
