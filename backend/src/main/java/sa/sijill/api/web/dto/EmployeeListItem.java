package sa.sijill.api.web.dto;

import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.Employee;

public record EmployeeListItem(
        UUID id,
        String employeeNumber,
        String name,
        String phone,
        LocalizedRef jobTitle,
        List<LocalizedRef> departments,
        boolean active) {

    public static EmployeeListItem from(Employee employee) {
        return new EmployeeListItem(
                employee.getId(),
                employee.getEmployeeNumber(),
                employee.getName(),
                employee.getPhone(),
                employee.getJobTitle() == null ? null : LocalizedRef.from(employee.getJobTitle()),
                employee.getDepartments().stream().map(LocalizedRef::from).toList(),
                employee.isActive());
    }
}
