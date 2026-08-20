# OOM on asset request approval — investigation handoff

**Status:** the eager cycle now has a structural fix; production reproduction
verification is pending. `max_fetch_depth: 2` remains as defense-in-depth.

## Symptom

`POST /api/v1/asset-requests/{id}/approve` kills the API process.

- Caddy logs the request as `"status": 0, "size": 0` after 4.8s / 6.9s / 15.6s — no response ever produced, upstream connection dropped.
- The browser spins until the frontend's 45s client timeout (`REQUEST_TIMEOUT_MS` in `frontend/src/lib/apiClient.ts`).
- JVM terminates with `java.lang.OutOfMemoryError: Java heap space`, heap dump 3,530,677,092 bytes.
- Creating an asset request (`POST /api/v1/asset-requests`) is consistently fast (~0.3s). All `GET` endpoints are fast (~0.2–0.3s).

## Environment

- Spring Boot 3.3.2, Hibernate 6.5.2, Java 21, Postgres 18.6
- Single VPS, 5 containers (`infra/vps/docker-compose.yml`), 7.8 GB RAM, ~6 GB free
- `spring.jpa.open-in-view: false` — DTO mapping happens in controllers, **after** the transaction closes
- `hibernate.default_batch_fetch_size: 32`
- JVM: `-XX:+ExitOnOutOfMemoryError -XX:MaxRAMPercentage=35 -XX:+HeapDumpOnOutOfMemoryError`
- Heap dumps use timestamped files under `/heap-dumps`, backed by the
  `api-heap-dumps` Docker volume so API recreation cannot delete them.

## Established facts

| Fact | Evidence |
|---|---|
| Genuine Java heap OOM, not a kernel kill | `Terminating due to java.lang.OutOfMemoryError: Java heap space`; `dmesg \| grep "killed process"` empty |
| Not caused by JVM sizing | Host had ~6 GB free; heap capped at ~2.7 GB and was genuinely exhausted |
| Not data volume | 8 asset requests total; max 7 action rows on any request; max 2 lines |
| Occurs inside the service, not the controller's DTO mapping | Hikari: `Apparent connection leak detected ... at sa.sijill.api.service.AssetRequestService.approve` — the transaction was still open |
| It completes on very small data | After deleting all rows and creating one fresh request, approve succeeded but still tripped the 20s leak detector, then logged `was returned to the pool (unleaked)` |
| Therefore: expensive, not infinite | Cost scales with data. One request = slow. Eight = fatal. |

That last row is the important one. This is **not** corrupt legacy data — it is a load that grows with the graph and will return as records accumulate.

## Theories tried and disproven

1. **Caddy holding a stale upstream container IP.** Disproven — Caddy access log shows the POST reaching the API and the API dying mid-request; `GET`s on the same connection succeed.
2. **Runaway allocation in `AssetRequestService.approve` logic.** Disproven by reading every line: `openRequest` (one `findById`), `requireStatus`, `requireWithinScope`, `requireNotRepeatingOverturnedDecision` (bounded stream over one request's actions), `addAction` (one object), `save` (one row + one audit row). `ReviewPolicyService.get()` is a single `findById`. `AuditService.record()` builds one entity. Nothing unbounded.
3. **`@PreAuthorize` authority evaluation.** Disproven — authorities are a plain `List<SimpleGrantedAuthority>` built once in `JwtAuthenticationFilter` from `employee.getPermissions()`. String match against a small list.
4. **Infinite loop in `DepartmentScopeService.scopeFor`.** Disproven — the cycle guard (`if (!scope.add(current)) continue;`) is correct and terminates.
5. **Cartesian product duplicating the `actions` bag, re-persisted by `cascade = ALL`.** Disproven by measurement — `select asset_request_id, count(*) from asset_request_action group by 1` showed max 3 rows. No duplication in the database.

## Root-cause hypothesis and remediation

**An EAGER association cycle between `Employee` and `Attachment`.**

```
Employee.photoAttachment   @ManyToOne(fetch = EAGER)  -> Attachment
Attachment.uploadedBy      @ManyToOne(fetch = EAGER)  -> Employee
```

Hibernate's `max_fetch_depth` is unlimited by default. Loading one `Employee` outer-joins their photo, that photo's uploader, that uploader's photo, and onward. Each hop additionally widens the result set by that employee's two EAGER `@ManyToMany` collections:

```java
// Employee.java
@ManyToMany(fetch = FetchType.EAGER) Set<Department> departments;   // ~3 rows
@ManyToMany(fetch = FetchType.EAGER) Set<Permission> permissions;   // ~37 rows
@ManyToOne(fetch = FetchType.EAGER)  JobTitle jobTitle;
@ManyToOne(fetch = FetchType.EAGER)  Attachment photoAttachment;    // cycle edge
```

Rows multiply rather than add, which is the only mechanism found that produces 2.7 GB from this dataset.

Why it fits every observation:

- **Create is fast** — a new entity loads nothing.
- **Approve is fatal** — `AssetRequest.actions` is EAGER, and every `AssetRequestAction.actor` is an EAGER `Employee`, so each action enters the cycle independently.
- **Deleting rows helped** — fewer actions, fewer distinct actors, shorter chains. It did not remove a "bad" record.
- **Never visible in the code** — it is in the mappings, not the logic.
- **Warehouse and maintenance work** — same mapping shape (`NeedRequest`, `MaintenanceRequest`), but the chains happened to be shorter. **They are equally exposed.**

### Initial containment

`backend/src/main/resources/application.yml`:

```yaml
spring.jpa.properties.hibernate.max_fetch_depth: 2
```

This capped the graph while the affected response paths were identified.

### Structural fix

- `Attachment.uploadedBy` is now `LAZY`, breaking the reverse edge back into
  `Employee` for asset, warehouse, and maintenance request histories.
- Attachment list and request-card responses select only attachment scalars and
  `uploadedBy.name` through `AttachmentSummary` projection queries.
- Upload responses use the already-authenticated actor name, so no DTO path
  traverses `Attachment.uploadedBy` after the transaction closes.
- `max_fetch_depth: 2` stays in place as a guard against a future accidental
  eager cycle; correctness no longer depends on it.

This avoids both failure modes that prevented a direct LAZY change before:

- employee DTOs may still read their eager profile attachment;
- attachment DTOs no longer dereference the lazy uploader.

## What is NOT verified

- The structural fix must pass backend integration CI before deployment.
- It still must be tested against the production reproduction. It removes the
  only cyclic eager mapping found, but the original heap dump was lost before
  a dominator-tree analysis could prove that this was the retained graph.

## Reproduction

1. Create several asset requests (5–10), ideally raised and acted on by **different employees who each have a profile photo** — the photo is the cycle edge.
2. Approve one.
3. Expected on failure: no HTTP response, API restarts within ~20s (`ExitOnOutOfMemoryError`), `OutOfMemoryError: Java heap space` in `docker compose logs api`.

## Artifacts

- The original 3.5 GB `/tmp/java_pid1.hprof` was lost when its API container
  was recreated on 2026-08-16; no old API container remained.
- Future dumps survive in the `api-heap-dumps` Docker volume as
  `/heap-dumps/java_pid1_<UTC timestamp>.hprof`. List them with
  `docker compose exec api ls -lh /heap-dumps` and copy one with
  `docker compose cp api:/heap-dumps/<filename> ./oom-heap.hprof`.
- Caddy access log: `/data/access.log` in the `sijill-caddy-1` container — the `status: 0` entries.

## Recommended next steps

1. **Analyse the heap dump.** MAT's dominator tree will name the retained class in minutes and settle this definitively. Everything above is inference; this is measurement.
2. Verify the deployed structural fix against the reproduction above.
3. If it is still slow, give action DTOs projections for actor names and load
   authentication permissions through a dedicated query. Those are further
   graph reductions, not prerequisites for breaking the known cycle.
4. Once the production reproduction remains stable, remove
   `-XX:+HeapDumpOnOutOfMemoryError` from `infra/vps/docker-compose.yml`. Keep
   `-XX:+ExitOnOutOfMemoryError`.

## Related commits

- `bffea03` — `ExitOnOutOfMemoryError`, heap dump, `MaxRAMPercentage=35`; entrypoint changed to `sh -c` so `JAVA_OPTS` is expanded (exec-form `ENTRYPOINT` does not expand variables)
- `85b0965` — `max_fetch_depth: 2` (the candidate fix)
