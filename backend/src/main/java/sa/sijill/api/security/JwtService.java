package sa.sijill.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Tokens carry only the employee id ({@code sub}) — never permissions.
 * JwtAuthenticationFilter reloads the employee from the DB on every request
 * so a permission change takes effect immediately, not just after re-login.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long accessTokenExpiryMinutes;

    public JwtService(
            @Value("${app.jwt.signing-secret}") String signingSecret,
            @Value("${app.jwt.access-token-expiry-minutes}") long accessTokenExpiryMinutes) {
        this.signingKey = Keys.hmacShaKeyFor(signingSecret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiryMinutes = accessTokenExpiryMinutes;
    }

    public String issueAccessToken(UUID employeeId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(employeeId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenExpiryMinutes, ChronoUnit.MINUTES)))
                .signWith(signingKey)
                .compact();
    }

    public Optional<UUID> parseEmployeeId(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(UUID.fromString(claims.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
