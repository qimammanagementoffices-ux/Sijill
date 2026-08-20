package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import sa.sijill.api.error.ApiException;

/**
 * A live account was found on a 4-digit PIN of 0000, so both halves of the
 * policy matter: the length floor and the refusal of the handful of PINs
 * people actually reach for.
 */
class PinValidatorTest {

    private final PinValidator validator = new PinValidator();

    @Test
    void acceptsAnOrdinarySixDigitPin() {
        validator.validate("482913", "482913");
        assertThat(validator.meetsPolicy("482913")).isTrue();
    }

    @Test
    void refusesAnythingShorterThanSix() {
        assertThatThrownBy(() -> validator.validate("0000", "0000")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> validator.validate("48291", "48291")).isInstanceOf(ApiException.class);
        assertThat(validator.meetsPolicy("0000")).isFalse();
    }

    @Test
    void refusesNonNumericAndOverlongPins() {
        assertThatThrownBy(() -> validator.validate("abcdef", "abcdef")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> validator.validate("4829133", "4829133")).isInstanceOf(ApiException.class);
    }

    @Test
    void refusesRepeatedDigitsAndConsecutiveRuns() {
        for (String trivial : new String[] {"000000", "111111", "123456", "654321", "345678"}) {
            assertThatThrownBy(() -> validator.validate(trivial, trivial))
                    .as(trivial + " should be refused")
                    .isInstanceOf(ApiException.class);
            assertThat(validator.meetsPolicy(trivial)).as(trivial).isFalse();
        }
    }

    @Test
    void doesNotMistakeOrdinaryPinsForRuns() {
        // Start like a run but break, or repeat a pattern without being one.
        for (String ok : new String[] {"123457", "112233", "121212", "246810"}) {
            assertThat(validator.meetsPolicy(ok)).as(ok).isTrue();
        }
    }

    @Test
    void mismatchedConfirmationIsRefused() {
        assertThatThrownBy(() -> validator.validate("482913", "482914")).isInstanceOf(ApiException.class);
    }
}
