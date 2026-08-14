package sa.sijill.api.service;

import java.util.Map;
import org.springframework.stereotype.Component;
import sa.sijill.api.error.ApiException;

/**
 * Normalizes Saudi phone numbers to 05XXXXXXXX and converts Arabic-Indic
 * (٠-٩) and Persian (۰-۹) digits to Western digits, per master spec §7.
 * Must run server-side regardless of what the client already normalized.
 */
@Component
public class PhoneNormalizer {

    public String normalize(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            throw ApiException.validation(
                    "رقم الجوال مطلوب.", Map.of("phone", "رقم الجوال مطلوب"));
        }

        String digits = toWesternDigits(rawPhone).replaceAll("[^0-9]", "");

        // Accept +9665XXXXXXXX, 9665XXXXXXXX, 05XXXXXXXX, or 5XXXXXXXX and
        // normalize all to 05XXXXXXXX.
        if (digits.startsWith("9665") && digits.length() == 12) {
            digits = "0" + digits.substring(3);
        } else if (digits.startsWith("966") && digits.length() == 12) {
            digits = "0" + digits.substring(3);
        } else if (digits.startsWith("5") && digits.length() == 9) {
            digits = "0" + digits;
        }

        if (!digits.matches("05\\d{8}")) {
            throw ApiException.validation(
                    "رقم الجوال غير صحيح. أدخل رقمًا سعوديًا يبدأ بـ 05 ويتكوّن من 10 أرقام.",
                    Map.of("phone", "يجب إدخال رقم جوال سعودي صحيح"));
        }

        return digits;
    }

    private String toWesternDigits(String input) {
        StringBuilder result = new StringBuilder(input.length());
        for (char c : input.toCharArray()) {
            if (c >= '٠' && c <= '٩') { // Arabic-Indic ٠-٩
                result.append((char) ('0' + (c - '٠')));
            } else if (c >= '۰' && c <= '۹') { // Persian ۰-۹
                result.append((char) ('0' + (c - '۰')));
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }
}
