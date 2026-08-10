package sa.sijill.api.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// V77 was edited after it had already been applied, which left the recorded
// checksum disagreeing with the file and aborted startup -- the API stayed
// down until the history was repaired, and there is no psql access to this
// database to run `flyway repair` by hand.
//
// repair() rewrites checksums for applied migrations to match the files on
// disk and clears failed entries; it never re-runs a migration or touches
// application data. Running it before migrate() makes a checksum drift
// self-healing rather than an outage.
//
// This is a safety net, not a licence: an already-applied migration still
// must not be edited, because repair only fixes the checksum -- the edited
// statements never execute. Add a new migration instead.
@Configuration
public class FlywayRepairConfig {

    @Bean
    public FlywayMigrationStrategy repairBeforeMigrate() {
        return (Flyway flyway) -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
