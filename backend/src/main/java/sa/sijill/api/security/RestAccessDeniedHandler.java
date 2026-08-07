package sa.sijill.api.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import sa.sijill.api.error.ErrorResponseWriter;

@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ErrorResponseWriter errorResponseWriter;

    public RestAccessDeniedHandler(ErrorResponseWriter errorResponseWriter) {
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    public void handle(
            HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws java.io.IOException {
        errorResponseWriter.write(response, 403, "FORBIDDEN", "You do not have permission to do this");
    }
}
