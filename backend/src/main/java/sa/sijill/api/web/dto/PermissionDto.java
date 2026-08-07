package sa.sijill.api.web.dto;

import sa.sijill.api.domain.Permission;

public record PermissionDto(String key, String description) {

    public static PermissionDto from(Permission permission) {
        return new PermissionDto(permission.getKey(), permission.getDescription());
    }
}
