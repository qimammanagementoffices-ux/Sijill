package sa.sijill.api.security;

import org.springframework.stereotype.Component;

/**
 * Sliding-window limiter for POST /api/v1/auth/login, keyed by normalized
 * phone. Backed by {@link RateLimitStore} (Postgres), so it stays correct
 * even if the deployment ever scales to more than one API instance.
 */
@Component
public class LoginRateLimiter {

    // Burst: stops password-spraying a phone in one sitting.
    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 60;
    // Sustained: the burst window alone still permits 5/minute forever, i.e.
    // 7,200 tries a day -- enough to walk the whole 4-digit PIN space against
    // one account in about 33 hours. This second bucket caps a phone at 480
    // tries a day, which pushes that to roughly three weeks and puts a 6-digit
    // PIN out of reach entirely. Well above any human who simply forgot theirs.
    private static final int MAX_ATTEMPTS_HOURLY = 20;
    private static final long HOUR_SECONDS = 3600;

    private final RateLimitStore store;

    public LoginRateLimiter(RateLimitStore store) {
        this.store = store;
    }

    public boolean tryAcquire(String key) {
        // Both buckets are consumed on every attempt, never short-circuited:
        // an attacker who trips the burst limit must not get free sustained
        // attempts back by pausing.
        boolean burstOk = store.tryAcquire("login:" + key, MAX_ATTEMPTS, WINDOW_SECONDS);
        boolean sustainedOk = store.tryAcquire("login-hour:" + key, MAX_ATTEMPTS_HOURLY, HOUR_SECONDS);
        return burstOk && sustainedOk;
    }
}
