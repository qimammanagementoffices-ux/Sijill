package sa.sijill.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Phase 1 placeholder. Only /actuator/health is public; everything else requires
 * authentication once Phase 2 introduces the phone+PIN/JWT login flow and replaces
 * the temporary permit-all-for-authenticated posture below with real endpoint rules.
 *
 * Default posture stays "protected unless explicitly allowlisted" per
 * docs/api-conventions.md — do not widen this without a matching decision-record entry.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // stateless JWT API, no cookie-based session
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().denyAll() // nothing else is wired up yet — Phase 2 replaces this
            );
        return http.build();
    }
}
