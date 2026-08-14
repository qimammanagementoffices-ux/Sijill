package sa.sijill.api.web.dto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import sa.sijill.api.domain.Category;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.JobTitle;
import sa.sijill.api.domain.Room;

public record LocalizedRef(UUID id, String ar, String en) {

    public static LocalizedRef from(Department department) {
        return new LocalizedRef(
                department.getId(),
                departmentPath(department, Department::getNameAr),
                departmentPath(department, Department::getNameEn));
    }

    public static LocalizedRef from(JobTitle jobTitle) {
        return new LocalizedRef(jobTitle.getId(), jobTitle.getNameAr(), jobTitle.getNameEn());
    }

    public static LocalizedRef from(Category category) {
        return new LocalizedRef(category.getId(), category.getNameAr(), category.getNameEn());
    }

    public static LocalizedRef from(Room room) {
        return new LocalizedRef(room.getId(), room.getNameAr(), room.getNameEn());
    }

    private static String departmentPath(Department department, Function<Department, String> name) {
        List<String> levels = new ArrayList<>();
        Set<UUID> visited = new HashSet<>();
        Department current = department;
        while (current != null && visited.add(current.getId())) {
            levels.add(name.apply(current));
            current = current.getParent();
        }
        Collections.reverse(levels);
        return String.join("/", levels);
    }
}
