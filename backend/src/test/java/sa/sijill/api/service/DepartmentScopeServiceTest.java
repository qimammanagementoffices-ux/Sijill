package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.DepartmentRepository;

class DepartmentScopeServiceTest {

    private final DepartmentRepository repository = mock(DepartmentRepository.class);
    private final DepartmentScopeService service = new DepartmentScopeService(repository);

    @Test
    void rootGrantsNothingAndLevelTwoIncludesDescendants() {
        Department root = department(null);
        Department levelTwo = department(root);
        Department levelThree = department(levelTwo);
        Department levelFour = department(levelThree);
        when(repository.findAll()).thenReturn(List.of(root, levelTwo, levelThree, levelFour));

        Employee rootOnly = employee(root);
        assertThat(service.scopeFor(rootOnly)).isEmpty();

        Employee levelTwoOfficial = employee(levelTwo);
        assertThat(service.scopeFor(levelTwoOfficial))
                .containsExactlyInAnyOrder(levelTwo.getId(), levelThree.getId(), levelFour.getId());
    }

    @Test
    void levelThreeControlsOnlyItself() {
        Department root = department(null);
        Department levelTwo = department(root);
        Department levelThree = department(levelTwo);
        Department levelFour = department(levelThree);
        when(repository.findAll()).thenReturn(List.of(root, levelTwo, levelThree, levelFour));

        assertThat(service.scopeFor(employee(levelThree))).containsExactly(levelThree.getId());
    }

    private static Department department(Department parent) {
        Department department = new Department();
        department.setId(UUID.randomUUID());
        department.setParent(parent);
        return department;
    }

    private static Employee employee(Department... departments) {
        Employee employee = new Employee();
        employee.setDepartments(Set.of(departments));
        return employee;
    }
}
