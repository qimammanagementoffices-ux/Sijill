package sa.sijill.api.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Postgres-backed sliding-window counter shared by LoginRateLimiter and
// RestoreRateLimiter -- replaces the previous in-memory
// ConcurrentHashMap-based approach, which was documented as single-instance
// only (state not shared across app instances if the deployment ever scaled
// horizontally). One atomic upsert-with-conditional-reset per call, keyed by
// a caller-namespaced string so different limiters can't collide.
@Component
public class RateLimitStore {

    private static final String UPSERT_AND_COUNT =
            """
            insert into rate_limit_window (id, window_start, attempt_count)
            values (?, now(), 1)
            on conflict (id) do update set
                window_start = case
                    when rate_limit_window.window_start < now() - (? || ' seconds')::interval then now()
                    else rate_limit_window.window_start
                end,
                attempt_count = case
                    when rate_limit_window.window_start < now() - (? || ' seconds')::interval then 1
                    else rate_limit_window.attempt_count + 1
                end
            returning attempt_count
            """;

    private final JdbcTemplate jdbcTemplate;

    public RateLimitStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean tryAcquire(String key, int maxAttempts, long windowSeconds) {
        Integer count = jdbcTemplate.queryForObject(
                UPSERT_AND_COUNT, Integer.class, key, windowSeconds, windowSeconds);
        return count != null && count <= maxAttempts;
    }
}
