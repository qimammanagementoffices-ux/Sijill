package sa.sijill.api;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@ExtendWith(SpringExtension.class)
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
public abstract class AbstractIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("sijill_test")
            .withUsername("sijill_test")
            .withPassword("sijill_test");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("PGHOST", POSTGRES::getHost);
        registry.add("PGPORT", () -> POSTGRES.getMappedPort(5432));
        registry.add("PGDATABASE", POSTGRES::getDatabaseName);
        registry.add("DATABASE_USERNAME", POSTGRES::getUsername);
        registry.add("DATABASE_PASSWORD", POSTGRES::getPassword);
        // HS256 requires >= 32 bytes; this is a fixed test-only secret, never used outside CI/local tests.
        registry.add("JWT_SIGNING_SECRET", () -> "test-signing-secret-please-do-not-use-in-prod-32bytes+");
        registry.add("FRONTEND_ORIGIN", () -> "http://localhost:3000");
    }
}
