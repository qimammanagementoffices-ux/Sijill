package sa.sijill.api.security;

import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Sliding-window limiter for POST /api/v1/backups/{id}/restore, keyed by the
 * calling employee's id. Backed by {@link RateLimitStore} (Postgres) -- kept
 * as its own small class rather than merging into LoginRateLimiter, since
 * this guards a different, more destructive action with a tighter limit
 * (3/60s vs. login's 5/60s: a wrong PIN here is guessed against an
 * already-authenticated, possibly stolen/hijacked session, not an anonymous
 * login attempt).
 */
@Component
public class RestoreRateLimiter {

    private static final int MAX_ATTEMPTS = 3;
    private static final long WINDOW_SECONDS = 60;

    private final RateLimitStore store;

    public RestoreRateLimiter(RateLimitStore store) {
        this.store = store;
    }

    public boolean tryAcquire(UUID employeeId) {
        return store.tryAcquire("restore:" + employeeId, MAX_ATTEMPTS, WINDOW_SECONDS);
    }
}
