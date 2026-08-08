package sa.sijill.api.security;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * In-memory sliding-window limiter for POST /api/v1/backups/{id}/restore,
 * keyed by the calling employee's id. Same shape as {@link LoginRateLimiter}
 * but kept as its own small class rather than generalizing that one — this
 * guards a different, more destructive action and a shared abstraction isn't
 * worth risking a regression on the well-tested login path for. Tighter
 * than login's 5/60s since a wrong PIN here is guessed against a stolen/
 * hijacked session, not an unauthenticated identity. Single-instance only —
 * fine for Render's current single API instance; revisit if the deployment
 * ever scales horizontally.
 */
@Component
public class RestoreRateLimiter {

    private static final int MAX_ATTEMPTS = 3;
    private static final long WINDOW_SECONDS = 60;

    private record Window(Instant start, AtomicInteger count) {}

    private final ConcurrentHashMap<UUID, Window> windows = new ConcurrentHashMap<>();

    public boolean tryAcquire(UUID employeeId) {
        Instant now = Instant.now();
        Window window = windows.compute(employeeId, (k, existing) -> {
            if (existing == null || existing.start().plusSeconds(WINDOW_SECONDS).isBefore(now)) {
                return new Window(now, new AtomicInteger(0));
            }
            return existing;
        });
        return window.count().incrementAndGet() <= MAX_ATTEMPTS;
    }
}
