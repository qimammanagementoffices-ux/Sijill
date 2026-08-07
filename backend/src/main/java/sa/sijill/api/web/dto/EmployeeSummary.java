package sa.sijill.api.web.dto;

import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.Employee;

public record EmployeeSummary(
        UUID id, String employeeNumber, String name, String phone, List<String> permissions) {

    public static EmployeeSummary from(Employee employee) {
        return new EmployeeSummary(
                employee.getId(),
                employee.getEmployeeNumber(),
                employee.getName(),
                employee.getPhone(),
                employee.getPermissions().stream().map(p -> p.getKey()).sorted().toList());
    }
}
