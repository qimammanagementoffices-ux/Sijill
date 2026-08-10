package sa.sijill.api.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sa.sijill.api.domain.Department;
import sa.sijill.api.domain.JobTitle;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.error.StaleVersionException;
import sa.sijill.api.repository.DepartmentRepository;
import sa.sijill.api.repository.JobTitleRepository;
import sa.sijill.api.web.dto.LocalizedEntityDto;
import sa.sijill.api.web.dto.UpsertLocalizedEntityRequest;

/**
 * No delete for departments/job titles — same "don't delete referenced
 * reference data" caution the master spec applies to categories/room
 * groups (docs/sijill-master-spec.md §6).
 */
@Service
public class StructureService {

    private final DepartmentRepository departmentRepository;
    private final JobTitleRepository jobTitleRepository;

    public StructureService(DepartmentRepository departmentRepository, JobTitleRepository jobTitleRepository) {
        this.departmentRepository = departmentRepository;
        this.jobTitleRepository = jobTitleRepository;
    }

    public List<Department> listDepartments() {
        return departmentRepository.findAll();
    }

    public List<JobTitle> listJobTitles() {
        return jobTitleRepository.findAll();
    }

    @Transactional
    public Department createDepartment(UpsertLocalizedEntityRequest request) {
        validate(request);
        Department department = new Department();
        department.setNameAr(request.nameAr());
        department.setNameEn(request.nameEn());
        department.setNameHi(request.nameHi());
        return departmentRepository.save(department);
    }

    @Transactional
    public Department updateDepartment(UUID id, UpsertLocalizedEntityRequest request) {
        validate(request);
        Department department =
                departmentRepository.findById(id).orElseThrow(() -> ApiException.notFound("Department not found"));
        if (request.version() == null || !request.version().equals(department.getVersion())) {
            throw new StaleVersionException(LocalizedEntityDto.from(department));
        }
        department.setNameAr(request.nameAr());
        department.setNameEn(request.nameEn());
        department.setNameHi(request.nameHi());
        return departmentRepository.save(department);
    }

    @Transactional
    public JobTitle createJobTitle(UpsertLocalizedEntityRequest request) {
        validate(request);
        JobTitle jobTitle = new JobTitle();
        jobTitle.setNameAr(request.nameAr());
        jobTitle.setNameEn(request.nameEn());
        jobTitle.setNameHi(request.nameHi());
        return jobTitleRepository.save(jobTitle);
    }

    @Transactional
    public JobTitle updateJobTitle(UUID id, UpsertLocalizedEntityRequest request) {
        validate(request);
        JobTitle jobTitle =
                jobTitleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Job title not found"));
        if (request.version() == null || !request.version().equals(jobTitle.getVersion())) {
            throw new StaleVersionException(LocalizedEntityDto.from(jobTitle));
        }
        jobTitle.setNameAr(request.nameAr());
        jobTitle.setNameEn(request.nameEn());
        jobTitle.setNameHi(request.nameHi());
        return jobTitleRepository.save(jobTitle);
    }

    private void validate(UpsertLocalizedEntityRequest request) {
        if (request.nameAr() == null || request.nameAr().isBlank()) {
            throw ApiException.validation("Arabic name is required", Map.of("nameAr", "must not be blank"));
        }
        if (request.nameEn() == null || request.nameEn().isBlank()) {
            throw ApiException.validation("English name is required", Map.of("nameEn", "must not be blank"));
        }
    }
}
