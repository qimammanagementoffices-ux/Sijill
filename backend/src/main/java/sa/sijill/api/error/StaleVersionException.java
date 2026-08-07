package sa.sijill.api.error;

import org.springframework.http.HttpStatus;

/**
 * 409 conflict on optimistic-concurrency mismatch. Carries the fresh DTO so
 * GlobalExceptionHandler can embed it as "current" alongside "error", per
 * docs/api-conventions.md ("respond 409 CONFLICT with the current server
 * copy embedded, so the frontend can render a keep-mine/take-theirs UI").
 */
public class StaleVersionException extends ApiException {

    private final Object current;

    public StaleVersionException(Object current) {
        super(HttpStatus.CONFLICT, "CONFLICT", "This record was changed by someone else. Reload and try again.");
        this.current = current;
    }

    public Object getCurrent() {
        return current;
    }
}
