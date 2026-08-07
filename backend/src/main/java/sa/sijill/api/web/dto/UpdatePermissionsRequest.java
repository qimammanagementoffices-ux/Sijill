package sa.sijill.api.web.dto;

import java.util.Set;

public record UpdatePermissionsRequest(Set<String> permissionKeys, int version) {}
