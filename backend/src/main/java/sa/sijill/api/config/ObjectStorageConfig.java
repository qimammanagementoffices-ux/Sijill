package sa.sijill.api.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

// Talks to Supabase Storage's S3-compatible API — same AWS SDK client works
// against any S3-compatible endpoint by overriding the endpoint URL.
@Configuration
public class ObjectStorageConfig {

    @Bean
    public S3Client s3Client(
            @Value("${app.object-storage.endpoint}") String endpoint,
            @Value("${app.object-storage.region}") String region,
            @Value("${app.object-storage.access-key}") String accessKey,
            @Value("${app.object-storage.secret-key}") String secretKey) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(
                        StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true) // required by Supabase Storage's S3-compatible endpoint
                .build();
    }
}
