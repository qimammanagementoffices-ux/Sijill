package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import sa.sijill.api.domain.AssetRequest;
import sa.sijill.api.domain.AssetRequestStatus;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.domain.Permission;

class RequestEditPolicyTest {

    @Test
    void requesterCannotEditTheirOwnPendingRequests() {
        Employee requester = employeeWith("wh.request", "as.request");

        NeedRequest needRequest = new NeedRequest();
        needRequest.setRequester(requester);
        needRequest.setStatus(NeedRequestStatus.PENDING);

        AssetRequest assetRequest = new AssetRequest();
        assetRequest.setRequester(requester);
        assetRequest.setStatus(AssetRequestStatus.PENDING);

        assertThat(NeedRequestService.canEdit(needRequest, requester)).isFalse();
        assertThat(AssetRequestService.canEdit(assetRequest, requester)).isFalse();
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

    private Employee employeeWith(String... permissionKeys) {
        Employee employee = new Employee();
        for (String key : permissionKeys) {
            Permission permission = new Permission();
            permission.setKey(key);
            permission.setDescription(key);
            employee.getPermissions().add(permission);
        }
        return employee;
    }
}
