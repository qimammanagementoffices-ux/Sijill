package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.domain.NeedRequestLine;
import sa.sijill.api.domain.NeedRequestStatus;
import sa.sijill.api.repository.MaintenanceRequestRepository;
import sa.sijill.api.repository.NeedRequestRepository;
import sa.sijill.api.web.dto.CostDashboardDto;

class CostDashboardServiceTest {

    private final NeedRequestRepository needRequests = mock(NeedRequestRepository.class);
    private final MaintenanceRequestRepository maintenanceRequests = mock(MaintenanceRequestRepository.class);
    private final CostDashboardService service = new CostDashboardService(needRequests, maintenanceRequests);

    @Test
    void warehouseCostFollowsWhatWasIssuedNotWhatWasAsked() {
        // Requested 10, approved down to 5, storekeeper issued 3, at 10 each.
        NeedRequestLine issued = line(10, 5, 3, false);
        // Approver dropped this line — it must not reach the total.
        NeedRequestLine removed = line(20, 20, 20, true);

        when(needRequests.findAll())
                .thenReturn(List.of(request(NeedRequestStatus.DELIVERED, issued, removed)));

        CostDashboardDto dashboard = service.dashboard("warehouse", null, null);

        assertThat(dashboard.total()).isEqualByComparingTo("30");
    }

    @Test
    void approvedButUndeliveredRequestsAreNotCountedYet() {
        when(needRequests.findAll())
                .thenReturn(List.of(request(NeedRequestStatus.APPROVED, line(10, 10, null, false))));

        assertThat(service.dashboard("warehouse", null, null).total())
                .isEqualByComparingTo("0");
    }

    private NeedRequest request(NeedRequestStatus status, NeedRequestLine... lines) {
        Employee requester = new Employee();
        requester.setId(UUID.randomUUID());
        requester.setName("موظف");

        NeedRequest request = new NeedRequest();
        request.setId(UUID.randomUUID());
        request.setStatus(status);
        request.setRequester(requester);
        request.setCreatedAt(Instant.now());
        request.setLines(List.of(lines));
        return request;
    }

    private NeedRequestLine line(int requested, Integer approved, Integer issued, boolean removed) {
        InventoryItem item = new InventoryItem();
        item.setTaxInclusivePrice(new BigDecimal("10"));

        NeedRequestLine line = new NeedRequestLine();
        line.setInventoryItem(item);
        line.setQuantityRequested(requested);
        line.setQuantityApproved(approved);
        line.setQuantityIssued(issued);
        line.setRemoved(removed);
        return line;
    }
}
