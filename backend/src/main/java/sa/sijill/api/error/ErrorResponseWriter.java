package sa.sijill.api.error;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Shared by GlobalExceptionHandler and the security entry point/access-denied
 * handler (the latter run in the filter chain, before the DispatcherServlet,
 * so they can't rely on @RestControllerAdvice) — both must produce the exact
 * envelope from docs/api-conventions.md.
 */
@Component
public class ErrorResponseWriter {

    private final ObjectMapper objectMapper;

    public ErrorResponseWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        Map<String, Object> body =
                Map.of(
                        "error",
                        Map.of(
                                "code", code,
                                "message", message,
                                "fields", Map.of(),
                                "traceId", UUID.randomUUID().toString()));
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
