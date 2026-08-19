package sa.sijill.api.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

/**
 * The burst window alone leaves 5 attempts a minute available forever, which
 * walks a 4-digit PIN in about a day. A second, hourly bucket closes that, so
 * these tests pin the properties that make it work: both buckets are counted,
 * and either one can refuse.
 */
class LoginRateLimiterTest {

    @Test
    void aTrippedBurstStillConsumesTheHourlyBudget() {
        RateLimitStore store = mock(RateLimitStore.class);
        when(store.tryAcquire(eq("login:0500000000"), anyInt(), anyLong())).thenReturn(false);
        when(store.tryAcquire(eq("login-hour:0500000000"), anyInt(), anyLong())).thenReturn(true);

        assertThat(new LoginRateLimiter(store).tryAcquire("0500000000")).isFalse();

        // Not short-circuited: pausing after a burst must not hand back free
        // attempts, or the hourly cap is trivially sidestepped.
        verify(store).tryAcquire(eq("login-hour:0500000000"), anyInt(), anyLong());
    }

    @Test
    void theHourlyCapRefusesEvenWhenTheBurstWindowIsClear() {
        RateLimitStore store = mock(RateLimitStore.class);
        when(store.tryAcquire(eq("login:0500000000"), anyInt(), anyLong())).thenReturn(true);
        when(store.tryAcquire(eq("login-hour:0500000000"), anyInt(), anyLong())).thenReturn(false);

        assertThat(new LoginRateLimiter(store).tryAcquire("0500000000")).isFalse();
    }

    @Test
    void bothBucketsClearAllowsTheAttempt() {
        RateLimitStore store = mock(RateLimitStore.class);
        when(store.tryAcquire(eq("login:0500000000"), anyInt(), anyLong())).thenReturn(true);
        when(store.tryAcquire(eq("login-hour:0500000000"), anyInt(), anyLong())).thenReturn(true);

        assertThat(new LoginRateLimiter(store).tryAcquire("0500000000")).isTrue();
    }
}
