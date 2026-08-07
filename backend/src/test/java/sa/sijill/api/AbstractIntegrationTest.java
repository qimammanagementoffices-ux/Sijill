package sa.sijill.api;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Testcontainers "singleton container" pattern: started once in a static
 * initializer and never explicitly stopped (Ryuk/JVM shutdown reap it).
 * Deliberately NOT using @Testcontainers/@Container here — that annotation
 * combo stops the container in each test class's afterAll, and since this
 * field is inherited by every subclass, the first subclass to finish would
 * kill the container out from under every later test class (a well-known
 * gotcha with static containers declared in a shared base class).
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest
@AutoConfigureMockMvc
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("sijill_test")
            .withUsername("sijill_test")
            .withPassword("sijill_test");

    static {
        POSTGRES.start();
    }

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
        // No real object storage in CI/local tests — dummy values so the
        // S3Client bean constructs (no network call happens until a request
        // is actually made). Tests that need a successful upload/delete
        // round-trip are out of scope here; see AttachmentUploadTest for
        // what's covered instead (validation, permissions).
        registry.add("OBJECT_STORAGE_ENDPOINT", () -> "http://localhost:9999");
        registry.add("OBJECT_STORAGE_BUCKET", () -> "test-bucket");
        registry.add("OBJECT_STORAGE_ACCESS_KEY", () -> "test-access-key");
        registry.add("OBJECT_STORAGE_SECRET_KEY", () -> "test-secret-key");
        registry.add("OBJECT_STORAGE_PUBLIC_URL_BASE", () -> "http://localhost:9999/public");
    }
}
