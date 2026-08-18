package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Employee;

public record EmployeeOption(UUID id, String name) {
    public static EmployeeOption from(Employee employee) {
        return new EmployeeOption(employee.getId(), employee.getName());
    }
}
