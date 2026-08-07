package sa.sijill.api.service;

import java.util.Map;
import org.springframework.stereotype.Component;
import sa.sijill.api.error.ApiException;

/**
 * PIN length isn't pinned to an exact value by the master spec; 4-6 numeric
 * digits is the working default (typical PIN convention). Shared by
 * onboarding (first admin) and employee create/PIN-reset so they can't
 * silently drift apart.
 */
@Component
public class PinValidator {

    private static final int MIN_LENGTH = 4;
    private static final int MAX_LENGTH = 6;

    public void validate(String pin, String pinConfirm) {
        if (pin == null || !pin.matches("\\d{" + MIN_LENGTH + "," + MAX_LENGTH + "}")) {
            throw ApiException.validation(
                    "PIN must be " + MIN_LENGTH + "-" + MAX_LENGTH + " digits",
                    Map.of("pin", "must be numeric, " + MIN_LENGTH + "-" + MAX_LENGTH + " digits"));
        }
        if (!pin.equals(pinConfirm)) {
            throw ApiException.validation(
                    "PIN confirmation does not match", Map.of("pinConfirm", "must match pin"));
        }
    }
}
