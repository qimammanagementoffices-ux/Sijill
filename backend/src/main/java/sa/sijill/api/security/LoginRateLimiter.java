package sa.sijill.api.security;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * In-memory sliding-window limiter for POST /api/v1/auth/login, keyed by
 * normalized phone. Single-instance only — fine for Render's free/starter
 * tier MVP (one API instance); revisit if the deployment ever scales
 * horizontally, since this state isn't shared across instances.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 60;

    private record Window(Instant start, AtomicInteger count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public boolean tryAcquire(String key) {
        Instant now = Instant.now();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || existing.start().plusSeconds(WINDOW_SECONDS).isBefore(now)) {
                return new Window(now, new AtomicInteger(0));
            }
            return existing;
        });
        return window.count().incrementAndGet() <= MAX_ATTEMPTS;
    }
}
