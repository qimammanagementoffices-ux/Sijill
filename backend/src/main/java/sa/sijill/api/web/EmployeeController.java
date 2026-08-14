package sa.sijill.api.web;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.service.EmployeeService;
import sa.sijill.api.web.dto.CreateEmployeeRequest;
import sa.sijill.api.web.dto.EmployeeDetail;
import sa.sijill.api.web.dto.EmployeeListItem;
import sa.sijill.api.web.dto.PagedResponse;
import sa.sijill.api.web.dto.ResetPinRequest;
import sa.sijill.api.web.dto.UpdateEmployeeRequest;
import sa.sijill.api.web.dto.UpdatePermissionsRequest;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('emp.view')")
    public PagedResponse<EmployeeListItem> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID departmentId,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {
        Page<Employee> page = employeeService.search(q, departmentId, pageable);
        return PagedResponse.from(page, EmployeeListItem::from);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('emp.view')")
    public EmployeeDetail get(@PathVariable UUID id) {
        return EmployeeDetail.from(employeeService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('emp.manage')")
    public ResponseEntity<EmployeeDetail> create(@RequestBody CreateEmployeeRequest request) {
        Employee employee = employeeService.create(request);
        return ResponseEntity.ok(EmployeeDetail.from(employee));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('emp.manage')")
    public EmployeeDetail update(@PathVariable UUID id, @RequestBody UpdateEmployeeRequest request) {
        return EmployeeDetail.from(employeeService.update(id, request));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('emp.manage')")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        employeeService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAuthority('emp.manage')")
    public ResponseEntity<Void> reactivate(@PathVariable UUID id) {
        employeeService.reactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('emp.manage')")
    public EmployeeDetail updatePermissions(@PathVariable UUID id, @RequestBody UpdatePermissionsRequest request) {
        return EmployeeDetail.from(employeeService.updatePermissions(id, request));
    }

    @PutMapping("/{id}/pin")
    @PreAuthorize("hasAuthority('emp.manage')")
    public ResponseEntity<Void> resetPin(@PathVariable UUID id, @RequestBody ResetPinRequest request) {
        employeeService.resetPin(id, request);
        return ResponseEntity.noContent().build();
    }
}
