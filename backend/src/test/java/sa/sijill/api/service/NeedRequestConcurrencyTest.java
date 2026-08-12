package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import sa.sijill.api.AbstractIntegrationTest;
import sa.sijill.api.domain.AssetStatus;
import sa.sijill.api.domain.Domain;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.domain.NeedRequest;
import sa.sijill.api.error.ApiException;
import sa.sijill.api.repository.AssetRepository;
import sa.sijill.api.repository.AuditLogRepository;
import sa.sijill.api.repository.EmployeeRepository;
import sa.sijill.api.repository.InventoryItemRepository;
import sa.sijill.api.repository.NeedRequestRepository;
import sa.sijill.api.web.dto.CreateAssetRequest;
import sa.sijill.api.web.dto.CreateNeedRequestRequest;
import sa.sijill.api.web.dto.FinishNeedRequestRequest;
import sa.sijill.api.web.dto.NeedRequestLineRequest;

/**
 * Phase 7: exercises the two real, previously-untested concurrency races the
 * master spec calls out — two approved requests competing for the same
 * stock (decision-record.md D1's "accepted, must degrade gracefully" race),
 * and two concurrent creates racing a unique constraint. Deliberately NOT
 * class-level @Transactional (unlike most other integration tests) — each
 * thread needs its own real connection/transaction against the shared
 * Testcontainers Postgres instance, not one shared, rolled-back transaction.
 *
 * That means everything created here is permanently committed, unlike every
 * other test class — left uncleaned, the leftover employees break the
 * "no employees exist yet" precondition that /onboarding/first-admin (and
 * therefore almost every other test's bootstrap helper) depends on. Every
 * created row is tracked and deleted in @AfterEach, in FK-safe order (audit
 * log entries reference the actor employee; need requests cascade-delete
 * their own lines/actions but must go before the employee and item rows
 * they reference).
 */
class NeedRequestConcurrencyTest extends AbstractIntegrationTest {

    @Autowired private NeedRequestService needRequestService;
    @Autowired private AssetService assetService;
    @Autowired private InventoryItemRepository inventoryItemRepository;
    @Autowired private AssetRepository assetRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private NeedRequestRepository needRequestRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private final List<UUID> createdEmployeeIds = new ArrayList<>();
    private final List<UUID> createdNeedRequestIds = new ArrayList<>();
    private final List<UUID> createdInventoryItemIds = new ArrayList<>();
    // Populated from a background thread in attemptCreateAsset — only ever
    // by whichever of the two racing threads actually wins, but synchronized
    // regardless since it's still a cross-thread write.
    private final List<UUID> createdAssetIds = java.util.Collections.synchronizedList(new ArrayList<>());

    @AfterEach
    void cleanUpCommittedData() {
        auditLogRepository.deleteAll(auditLogRepository.findAll().stream()
                .filter(log -> log.getActor() != null && createdEmployeeIds.contains(log.getActor().getId()))
                .toList());
        createdNeedRequestIds.forEach(needRequestRepository::deleteById);
        createdAssetIds.forEach(assetRepository::deleteById);
        createdInventoryItemIds.forEach(inventoryItemRepository::deleteById);
        createdEmployeeIds.forEach(employeeRepository::deleteById);
    }

    private Employee createEmployee(String phone) {
        Employee employee = new Employee();
        employee.setEmployeeNumber("EMP-" + UUID.randomUUID().toString().substring(0, 8));
        employee.setName("Concurrency Test");
        employee.setPhone(phone);
        employee.setPinHash(passwordEncoder.encode("1234"));
        employee.setJoinedDate(LocalDate.now());
        employee.setActive(true);
        Employee saved = employeeRepository.save(employee);
        createdEmployeeIds.add(saved.getId());
        return saved;
    }

    private InventoryItem createItem(String code, int quantity) {
        InventoryItem item = new InventoryItem();
        item.setDomain(Domain.WAREHOUSE);
        item.setCode(code);
        item.setNameAr("صنف");
        item.setNameEn("Item");
        item.setQuantity(quantity);
        item.setMinQuantity(0);
        item.setDateAdded(LocalDate.now());
        item.setActive(true);
        InventoryItem saved = inventoryItemRepository.save(item);
        createdInventoryItemIds.add(saved.getId());
        return saved;
    }

    private NeedRequest submitAndApprove(UUID itemId, Employee actor) {
        NeedRequest request = needRequestService.submit(
                new CreateNeedRequestRequest(null, null, null, "concurrency test", List.of(new NeedRequestLineRequest(itemId, 1))),
                actor);
        createdNeedRequestIds.add(request.getId());
        return needRequestService.approve(request.getId(), actor);
    }

    // Returns true if this thread's finish() call succeeded, false if it hit
    // a clean, expected conflict (insufficient stock or a lost optimistic-
    // lock race) — anything else propagates and fails the test.
    private boolean attemptFinish(UUID requestId, UUID lineId, Employee actor, CountDownLatch ready, CountDownLatch go)
            throws InterruptedException {
        ready.countDown();
        go.await();
        try {
            needRequestService.finish(
                    requestId,
                    new FinishNeedRequestRequest(List.of(new FinishNeedRequestRequest.FinishLine(lineId, 1))),
                    actor);
            return true;
        } catch (ApiException | ObjectOptimisticLockingFailureException e) {
            return false;
        }
    }

    @Test
    void concurrentFinishOnSharedStockLetsOnlyOneSucceed() throws Exception {
        Employee actor = createEmployee("0597700001");
        InventoryItem item = createItem("CONC-001", 1);

        NeedRequest requestA = submitAndApprove(item.getId(), actor);
        NeedRequest requestB = submitAndApprove(item.getId(), actor);
        UUID lineA = requestA.getLines().get(0).getId();
        UUID lineB = requestB.getLines().get(0).getId();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            Callable<Boolean> taskA = () -> attemptFinish(requestA.getId(), lineA, actor, ready, go);
            Callable<Boolean> taskB = () -> attemptFinish(requestB.getId(), lineB, actor, ready, go);

            Future<Boolean> resultA = pool.submit(taskA);
            Future<Boolean> resultB = pool.submit(taskB);
            ready.await(5, TimeUnit.SECONDS);
            go.countDown();

            boolean succeededA = resultA.get(10, TimeUnit.SECONDS);
            boolean succeededB = resultB.get(10, TimeUnit.SECONDS);

            assertThat(succeededA ^ succeededB).as("exactly one finish() call should succeed").isTrue();
        } finally {
            pool.shutdown();
        }

        InventoryItem reloaded = inventoryItemRepository.findById(item.getId()).orElseThrow();
        assertThat(reloaded.getQuantity()).isZero();
    }

    private String attemptCreateAsset(Employee actor, CountDownLatch ready, CountDownLatch go)
            throws InterruptedException {
        ready.countDown();
        go.await();
        try {
            var created = assetService.create(
                    new CreateAssetRequest(
                            "أصل", "Asset", null, null, null, AssetStatus.ACTIVE, null, null, null, null, null, null, null, null, null),
                    actor);
            createdAssetIds.add(created.getId());
            return created.getAssetNumber();
        } catch (ApiException | DataIntegrityViolationException e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Asset numbers used to be client-supplied and guarded by an
     * existsByAssetNumber check, so this test asserted that two racing
     * creates left exactly one winner. Since V63 the number comes from
     * asset_number_seq, so the race is gone entirely: both creates now
     * succeed and must simply receive different numbers. A sequence hands
     * out each value once even to concurrent callers, and unlike the old
     * check-then-insert it does not roll back with the transaction.
     */
    @Test
    void concurrentCreatesBothSucceedWithDistinctAssetNumbers() throws Exception {
        Employee actor = createEmployee("0597700002");

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        String numberA;
        String numberB;
        try {
            Callable<String> taskA = () -> attemptCreateAsset(actor, ready, go);
            Callable<String> taskB = () -> attemptCreateAsset(actor, ready, go);

            Future<String> resultA = pool.submit(taskA);
            Future<String> resultB = pool.submit(taskB);
            ready.await(5, TimeUnit.SECONDS);
            go.countDown();

            numberA = resultA.get(10, TimeUnit.SECONDS);
            numberB = resultB.get(10, TimeUnit.SECONDS);
        } finally {
            pool.shutdown();
        }

        assertThat(numberA).as("both concurrent creates should succeed").isNotNull();
        assertThat(numberB).as("both concurrent creates should succeed").isNotNull();
        assertThat(numberA).as("the sequence must not hand out the same number twice").isNotEqualTo(numberB);
        assertThat(numberA).startsWith("AST-");
        assertThat(numberB).startsWith("AST-");
    }
}
