package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import sa.sijill.api.domain.AssetRequest;
import sa.sijill.api.domain.AssetRequestStatus;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.domain.Permission;

class RequestEditPolicyTest {

    @Test
    void requesterCanCorrectTheirOwnRequestInsideTheWindow() {
        Employee requester = employeeWith("wh.request", "as.request");

        assertThat(NeedRequestService.canEdit(needRequestFrom(requester, Instant.now()), requester))
                .isTrue();
        assertThat(AssetRequestService.canEdit(assetRequestFrom(requester, Instant.now()), requester))
                .isTrue();
    }

    @Test
    void requesterLosesTheirOwnRequestOnceTheWindowCloses() {
        Employee requester = employeeWith("wh.request", "as.request");
        Instant tooLate = Instant.now().minus(Duration.ofHours(2));

        assertThat(NeedRequestService.canEdit(needRequestFrom(requester, tooLate), requester)).isFalse();
        assertThat(AssetRequestService.canEdit(assetRequestFrom(requester, tooLate), requester)).isFalse();
    }

    @Test
    void theWindowBelongsToTheRequesterAloneNotToEveryColleague() {
        Employee requester = employeeWith("wh.request");
        Employee colleague = employeeWith("wh.request");

        assertThat(NeedRequestService.canEdit(needRequestFrom(requester, Instant.now()), colleague))
                .isFalse();
        assertThat(AssetRequestService.canEdit(assetRequestFrom(requester, Instant.now()), colleague))
                .isFalse();
    }

    @Test
    void moderatorCanEditOnlyPendingRequests() {
        Employee moderator = employeeWith("emp.manage");

        NeedRequest needRequest = new NeedRequest();
        needRequest.setStatus(NeedRequestStatus.PENDING);
        AssetRequest assetRequest = new AssetRequest();
        assetRequest.setStatus(AssetRequestStatus.PENDING);

        assertThat(NeedRequestService.canEdit(needRequest, moderator)).isTrue();
        assertThat(AssetRequestService.canEdit(assetRequest, moderator)).isTrue();

        needRequest.setStatus(NeedRequestStatus.APPROVED);
        assetRequest.setStatus(AssetRequestStatus.APPROVED);

        assertThat(NeedRequestService.canEdit(needRequest, moderator)).isFalse();
        assertThat(AssetRequestService.canEdit(assetRequest, moderator)).isFalse();
    }

    private NeedRequest needRequestFrom(Employee requester, Instant createdAt) {
        NeedRequest request = new NeedRequest();
        request.setRequester(requester);
        request.setStatus(NeedRequestStatus.PENDING);
        request.setCreatedAt(createdAt);
        return request;
    }

    private AssetRequest assetRequestFrom(Employee requester, Instant createdAt) {
        AssetRequest request = new AssetRequest();
        request.setRequester(requester);
        request.setStatus(AssetRequestStatus.PENDING);
        request.setCreatedAt(createdAt);
        return request;
    }

    private Employee employeeWith(String... permissionKeys) {
        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        for (String key : permissionKeys) {
            Permission permission = new Permission();
            permission.setKey(key);
            permission.setDescription(key);
            employee.getPermissions().add(permission);
        }
        return employee;
    }
}
