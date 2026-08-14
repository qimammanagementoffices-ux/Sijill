package sa.sijill.api.web.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import sa.sijill.api.domain.Department;

class LocalizedRefTest {

    @Test
    void departmentReferenceContainsTheFullHierarchyPath() {
        Department administration = department("الشؤون التعليمية", "Education Affairs", null);
        Department grade = department("الصف الثاني", "Second Grade", administration);
        Department stage = department("المرحلة الابتدائية", "Primary Stage", grade);

        LocalizedRef reference = LocalizedRef.from(stage);

        assertEquals("الشؤون التعليمية/الصف الثاني/المرحلة الابتدائية", reference.ar());
        assertEquals("Education Affairs/Second Grade/Primary Stage", reference.en());
    }

    private Department department(String nameAr, String nameEn, Department parent) {
        Department department = new Department();
        department.setId(UUID.randomUUID());
        department.setNameAr(nameAr);
        department.setNameEn(nameEn);
        department.setParent(parent);
        return department;
    }
}
