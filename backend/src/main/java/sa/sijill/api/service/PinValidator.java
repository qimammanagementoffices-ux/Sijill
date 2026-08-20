package sa.sijill.api.service;

import java.util.Map;
import org.springframework.stereotype.Component;
import sa.sijill.api.error.ApiException;

/**
 * PIN policy, shared by onboarding, employee create and PIN reset so they
 * cannot silently drift apart.
 *
 * Six digits, not the old 4-6. Four digits is 10,000 combinations; against the
 * login limiter's sustained budget that is walkable in about three weeks, and
 * a real account was found live on 0000. Six digits takes that out of reach.
 *
 * Trivial PINs are refused for the same reason: an attacker does not start at
 * 000000 and count upwards, they try the handful people actually pick. A
 * six-digit PIN of 123456 is no better than a four-digit one.
 */
@Component
public class PinValidator {

    private static final int LENGTH = 6;

    /** Throws unless the PIN satisfies the policy and matches its confirmation. */
    public void validate(String pin, String pinConfirm) {
        if (pin == null || !pin.matches("\\d{" + LENGTH + "}")) {
            throw ApiException.validation(
                    "PIN must be exactly " + LENGTH + " digits",
                    Map.of("pin", "must be numeric, exactly " + LENGTH + " digits"));
        }
        if (isTrivial(pin)) {
            throw ApiException.validation(
                    "PIN must not be a repeated digit or a run of consecutive digits",
                    Map.of("pin", "too easy to guess"));
        }
        if (!pin.equals(pinConfirm)) {
            throw ApiException.validation(
                    "PIN confirmation does not match", Map.of("pinConfirm", "must match pin"));
        }
    }

    /**
     * Does this PIN satisfy the current policy? Asked at login, where the
     * plaintext is the only chance to judge an existing PIN -- stored PINs are
     * BCrypt hashes, so nothing can be told about them at rest.
     */
    public boolean meetsPolicy(String pin) {
        return pin != null && pin.matches("\\d{" + LENGTH + "}") && !isTrivial(pin);
    }

    /** 111111, 123456 and 654321 -- one repeated digit, or a consecutive run. */
    private boolean isTrivial(String pin) {
        int firstStep = pin.charAt(1) - pin.charAt(0);
        if (firstStep != 0 && firstStep != 1 && firstStep != -1) return false;
        for (int i = 2; i < pin.length(); i++) {
            if (pin.charAt(i) - pin.charAt(i - 1) != firstStep) return false;
        }
        return true;
    }
}
