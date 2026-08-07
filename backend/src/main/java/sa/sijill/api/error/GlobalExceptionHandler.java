package sa.sijill.api.error;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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
