package sa.sijill.api.repository;

/** Projection for {@link PermissionRepository#countActiveEmployeesByPermission()}. */
public interface PermissionEmployeeCount {
    String getKey();

    Long getEmployeeCount();
}
