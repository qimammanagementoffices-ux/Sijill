package sa.sijill.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SijillApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SijillApiApplication.class, args);
    }
}
