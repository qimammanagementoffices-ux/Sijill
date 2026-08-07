package sa.sijill.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import sa.sijill.api.domain.Employee;
import sa.sijill.api.repository.EmployeeRepository;

/**
 * Loads the Employee fresh from the DB on every request and grants
 * authorities from its *current* permission set — permissions are never
 * trusted from the token itself, so a permission change (or deactivation)
 * takes effect on the very next request, not just after re-login.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final EmployeeRepository employeeRepository;

    public JwtAuthenticationFilter(JwtService jwtService, EmployeeRepository employeeRepository) {
        this.jwtService = jwtService;
        this.employeeRepository = employeeRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length());
            Optional<UUID> employeeId = jwtService.parseEmployeeId(token);

            if (employeeId.isPresent()) {
                Optional<Employee> employee = employeeRepository.findById(employeeId.get());
                if (employee.isPresent() && employee.get().isActive()) {
                    setAuthentication(employee.get(), request);
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private void setAuthentication(Employee employee, HttpServletRequest request) {
        List<GrantedAuthority> authorities =
                employee.getPermissions().stream()
                        .map(p -> (GrantedAuthority) new SimpleGrantedAuthority(p.getKey()))
                        .toList();

        var authentication = new UsernamePasswordAuthenticationToken(employee, null, authorities);
        authentication.setDetails(request);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
