package sa.sijill.api.web.dto;

import sa.sijill.api.repository.PermissionEmployeeCount;

public record PermissionOverviewDto(String key, long employeeCount) {

    public static PermissionOverviewDto from(PermissionEmployeeCount row) {
        return new PermissionOverviewDto(row.getKey(), row.getEmployeeCount());
    }
}
