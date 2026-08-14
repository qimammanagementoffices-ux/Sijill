package sa.sijill.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import sa.sijill.api.error.ApiException;

class PhoneNormalizerTest {

    private final PhoneNormalizer normalizer = new PhoneNormalizer();

    @Test
    void normalizesLocalFormat() {
        assertThat(normalizer.normalize("0512345678")).isEqualTo("0512345678");
    }

    @Test
    void normalizesWithoutLeadingZero() {
        assertThat(normalizer.normalize("512345678")).isEqualTo("0512345678");
    }

    @Test
    void normalizesInternationalFormat() {
        assertThat(normalizer.normalize("+966512345678")).isEqualTo("0512345678");
        assertThat(normalizer.normalize("966512345678")).isEqualTo("0512345678");
    }

    @Test
    void convertsArabicIndicDigits() {
        // ٠٥١٢٣٤٥٦٧٨ is 0512345678 in Arabic-Indic digits
        assertThat(normalizer.normalize("٠٥١٢٣٤٥٦٧٨"))
                .isEqualTo("0512345678");
    }

    @Test
    void convertsPersianDigits() {
        // same digits in the Persian block
        assertThat(normalizer.normalize("۰۵۱۲۳۴۵۶۷۸"))
                .isEqualTo("0512345678");
    }

    @Test
    void rejectsInvalidPhone() {
        assertThatThrownBy(() -> normalizer.normalize("12345"))
                .isInstanceOf(ApiException.class)
                .hasMessage("رقم الجوال غير صحيح. أدخل رقمًا سعوديًا يبدأ بـ 05 ويتكوّن من 10 أرقام.");
    }

    @Test
    void rejectsBlankPhone() {
        assertThatThrownBy(() -> normalizer.normalize(" "))
                .isInstanceOf(ApiException.class)
                .hasMessage("رقم الجوال مطلوب.");
    }
}
