package sa.sijill.api.web;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.service.RoomService;
import sa.sijill.api.web.dto.RoomDto;
import sa.sijill.api.web.dto.UpsertRoomRequest;

@RestController
@RequestMapping("/api/v1/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public List<RoomDto> list() {
        return roomService.list().stream().map(RoomDto::from).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('as.view', 'as.request')")
    public RoomDto get(@PathVariable UUID id) {
        return RoomDto.from(roomService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('as.manage')")
    public RoomDto create(@RequestBody UpsertRoomRequest request) {
        return RoomDto.from(roomService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('as.manage')")
    public RoomDto update(@PathVariable UUID id, @RequestBody UpsertRoomRequest request) {
        return RoomDto.from(roomService.update(id, request));
    }
}
