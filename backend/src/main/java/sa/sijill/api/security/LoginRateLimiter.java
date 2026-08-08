package sa.sijill.api.security;

import org.springframework.stereotype.Component;

/**
 * Sliding-window limiter for POST /api/v1/auth/login, keyed by normalized
 * phone. Backed by {@link RateLimitStore} (Postgres), so it stays correct
 * even if the deployment ever scales to more than one API instance.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 60;

    private final RateLimitStore store;

    public LoginRateLimiter(RateLimitStore store) {
        this.store = store;
    }

    public boolean tryAcquire(String key) {
        return store.tryAcquire("login:" + key, MAX_ATTEMPTS, WINDOW_SECONDS);
    }
}
