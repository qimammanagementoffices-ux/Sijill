package sa.sijill.api.error;

import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Base for exceptions that map directly to the error envelope in
 * docs/api-conventions.md. Thrown from services/controllers, translated by
 * GlobalExceptionHandler.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fields;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public ApiException(HttpStatus status, String code, String message, Map<String, String> fields) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public Map<String, String> getFields() {
        return fields;
    }

    public static ApiException validation(String message, Map<String, String> fields) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, fields);
    }

    public static ApiException unauthenticated(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, "CONFLICT", message);
    }

    public static ApiException rateLimited(String message) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", message);
    }
}
