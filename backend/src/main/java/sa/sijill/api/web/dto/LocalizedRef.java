package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.JobTitle;

public record LocalizedRef(UUID id, String ar, String en) {

    public static LocalizedRef from(Department department) {
        return new LocalizedRef(department.getId(), department.getNameAr(), department.getNameEn());
    }

    public static LocalizedRef from(JobTitle jobTitle) {
        return new LocalizedRef(jobTitle.getId(), jobTitle.getNameAr(), jobTitle.getNameEn());
    }
}
