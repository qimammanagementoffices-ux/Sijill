package sa.sijill.api.web.dto;

import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.Employee;

public record EmployeeSummary(
        UUID id,
        String employeeNumber,
        String name,
        String phone,
        String photoUrl,
        UUID photoAttachmentId,
        int version,
        List<String> permissions,
        List<LocalizedRef> departments) {

    public static EmployeeSummary from(Employee employee) {
        return new EmployeeSummary(
                employee.getId(),
                employee.getEmployeeNumber(),
                employee.getName(),
                employee.getPhone(),
                employee.getPhotoAttachment() == null ? null : employee.getPhotoAttachment().getUrl(),
                employee.getPhotoAttachment() == null ? null : employee.getPhotoAttachment().getId(),
                employee.getVersion(),
                employee.getPermissions().stream().map(p -> p.getKey()).sorted().toList(),
                employee.getDepartments().stream().map(LocalizedRef::from).toList());
    }
}
