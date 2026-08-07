package sa.sijill.api.error;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(StaleVersionException.class)
    public ResponseEntity<Map<String, Object>> handleStaleVersion(StaleVersionException ex) {
        String traceId = UUID.randomUUID().toString();
        return ResponseEntity.status(ex.getStatus())
                .body(Map.of(
                        "error",
                        Map.of(
                                "code", ex.getCode(),
                                "message", ex.getMessage(),
                                "fields", ex.getFields(),
                                "traceId", traceId),
                        "current", ex.getCurrent()));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        String traceId = UUID.randomUUID().toString();
        return ResponseEntity.status(ex.getStatus())
                .body(Map.of(
                        "error",
                        Map.of(
                                "code", ex.getCode(),
                                "message", ex.getMessage(),
                                "fields", ex.getFields(),
                                "traceId", traceId)));
    }

    // @PreAuthorize denials throw AccessDeniedException from inside the
    // controller-method invocation, which DispatcherServlet routes to this
    // @RestControllerAdvice *before* it ever reaches Spring Security's
    // ExceptionTranslationFilter / RestAccessDeniedHandler in the filter
    // chain. Without an explicit handler here, the catch-all Exception.class
    // handler below would swallow it into a 500 instead of a 403 — that's
    // exactly what happened until this was added (see backend test suite:
    // EmployeeDirectoryTest/StructureCrudTest's @PreAuthorize-denial cases).
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        String traceId = UUID.randomUUID().toString();
        return ResponseEntity.status(403)
                .body(Map.of(
                        "error",
                        Map.of(
                                "code", "FORBIDDEN",
                                "message", "You do not have permission to do this",
                                "fields", Map.of(),
                                "traceId", traceId)));
    }

    // Same reasoning as AccessDeniedException above, for completeness in
    // case an AuthenticationException is ever thrown from inside a
    // controller/service rather than the filter chain.
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(AuthenticationException ex) {
        String traceId = UUID.randomUUID().toString();
        return ResponseEntity.status(401)
                .body(Map.of(
                        "error",
                        Map.of(
                                "code", "UNAUTHENTICATED",
                                "message", "Authentication required",
                                "fields", Map.of(),
                                "traceId", traceId)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        String traceId = UUID.randomUUID().toString();
        log.error("Unhandled exception, traceId={}", traceId, ex);
        return ResponseEntity.status(500)
                .body(Map.of(
                        "error",
                        Map.of(
                                "code", "INTERNAL_ERROR",
                                "message", "Something went wrong",
                                "fields", Map.of(),
                                "traceId", traceId)));
    }
}
