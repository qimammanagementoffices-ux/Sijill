package sa.sijill.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import sa.sijill.api.error.ErrorResponseWriter;
import sa.sijill.api.service.MaintenanceService;

/**
 * Runs after JwtAuthenticationFilter (Authentication is already resolved) so
 * it can check for the sys.maintenance bypass authority. When maintenance
 * mode is on, every request is rejected with 503 except:
 * - routes the site itself needs to still function (health check, login,
 *   the maintenance/branding/dictionary endpoints — kept in sync with
 *   SecurityConfig's permitAll list, plus /auth/me so the frontend can
 *   explicitly resolve "no bypass" rather than inferring it from a 503), and
 * - any caller currently holding sys.maintenance.
 */
@Component
public class MaintenanceModeFilter extends OncePerRequestFilter {

    private static final Set<String> ALWAYS_PERMITTED = Set.of(
            "/actuator/health",
            "/api/v1/system/status",
            "/api/v1/auth/login",
            "/api/v1/auth/me",
            "/api/v1/i18n/dictionary",
            "/api/v1/i18n/locales",
            "/api/v1/branding",
            "/api/v1/maintenance");

    private final MaintenanceService maintenanceService;
    private final ErrorResponseWriter errorResponseWriter;

    public MaintenanceModeFilter(MaintenanceService maintenanceService, ErrorResponseWriter errorResponseWriter) {
        this.maintenanceService = maintenanceService;
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        if (!maintenanceService.isEnabled()
                || ALWAYS_PERMITTED.contains(request.getRequestURI())
                || hasBypass()) {
            filterChain.doFilter(request, response);
            return;
        }

        errorResponseWriter.write(response, 503, "MAINTENANCE", "Site is under maintenance");
    }

    private boolean hasBypass() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("sys.maintenance"));
    }
}
