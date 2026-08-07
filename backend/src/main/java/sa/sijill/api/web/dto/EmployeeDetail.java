package sa.sijill.api.web.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.Employee;

public record EmployeeDetail(
        UUID id,
        String employeeNumber,
        String name,
        String phone,
        String email,
        String nationalId,
        LocalDate joinedDate,
        boolean active,
        LocalizedRef jobTitle,
        List<LocalizedRef> departments,
        List<String> permissions,
        int version) {

    public static EmployeeDetail from(Employee employee) {
        return new EmployeeDetail(
                employee.getId(),
                employee.getEmployeeNumber(),
                employee.getName(),
                employee.getPhone(),
                employee.getEmail(),
                employee.getNationalId(),
                employee.getJoinedDate(),
                employee.isActive(),
                employee.getJobTitle() == null ? null : LocalizedRef.from(employee.getJobTitle()),
                employee.getDepartments().stream().map(LocalizedRef::from).toList(),
                employee.getPermissions().stream().map(p -> p.getKey()).sorted().toList(),
                employee.getVersion());
    }
}
