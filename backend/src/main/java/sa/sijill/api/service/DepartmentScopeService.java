package sa.sijill.api.service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.Permission;
import sa.sijill.api.repository.DepartmentRepository;

/**
 * Which departments an official may act on.
 *
 * Level 2 controls itself and its descendants. Level 3 (or deeper) controls
 * only itself. The root administration grants no request scope.
 *
 * A root department is deliberately worth nothing here. Every employee belongs
 * to "الإدارة العامة", so honouring it would hand the whole school to everyone
 * and make the restriction meaningless — someone who genuinely needs that has
 * {@link #ALL_DEPARTMENTS_PERMISSION} instead, which says so explicitly.
 */
@Service
public class DepartmentScopeService {

    public static final String ALL_DEPARTMENTS_PERMISSION = "sys.requests.all";

    private final DepartmentRepository departmentRepository;

    public DepartmentScopeService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    public boolean seesEveryDepartment(Employee actor) {
        return actor != null
                && actor.getPermissions().stream()
                        .map(Permission::getKey)
                        .anyMatch(ALL_DEPARTMENTS_PERMISSION::equals);
    }

    /**
     * The department ids this employee covers, themselves and downwards.
     * Empty when they cover none — which is a real answer, not a missing one:
     * an employee attached only to the root sees only their own requests.
     *
     * Returns null when the employee covers everything, so callers can skip
     * filtering entirely rather than build a list of every department.
     */
    public Set<UUID> scopeFor(Employee actor) {
        if (seesEveryDepartment(actor)) return null;

        Set<UUID> roots = new HashSet<>();
        Set<UUID> exactOnly = new HashSet<>();
        for (Department department : actor.getDepartments()) {
            // The root is everyone's, so it grants nothing.
            if (department.getParent() == null) continue;
            if (department.getParent().getParent() == null) {
                roots.add(department.getId());
            } else {
                exactOnly.add(department.getId());
            }
        }
        if (roots.isEmpty()) return exactOnly;

        // The department table is small enough to walk in memory; a recursive
        // CTE would be faster and much harder to read for no gain at this size.
        Map<UUID, List<UUID>> childrenByParent = new HashMap<>();
        for (Department department : departmentRepository.findAll()) {
            if (department.getParent() == null) continue;
            childrenByParent
                    .computeIfAbsent(department.getParent().getId(), key -> new ArrayList<>())
                    .add(department.getId());
        }

        Set<UUID> scope = new HashSet<>(exactOnly);
        Deque<UUID> pending = new ArrayDeque<>(roots);
        while (!pending.isEmpty()) {
            UUID current = pending.pop();
            // add() returning false means we have been here: a cycle in the
            // tree would otherwise spin forever.
            if (!scope.add(current)) continue;
            pending.addAll(childrenByParent.getOrDefault(current, List.of()));
        }
        return scope;
    }

    /** Whether this official may decide on a request belonging to this department. */
    public boolean covers(Employee actor, Department department) {
        Set<UUID> scope = scopeFor(actor);
        if (scope == null) return true;
        // A request with no department belongs to no branch, so only someone
        // who covers everything can act on it.
        return department != null && scope.contains(department.getId());
    }
}
