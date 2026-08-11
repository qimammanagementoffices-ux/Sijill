package sa.sijill.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

@ExtendWith(MockitoExtension.class)
class StorageServiceTest {

    @Mock
    private S3Client s3Client;

    private StorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new StorageService(
                s3Client,
                "public-attachments",
                "private-backups",
                "https://example.supabase.co/storage/v1/object/public");
    }

    @Test
    void attachmentUploadUsesPublicBucketAndUrl() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());
        var file = new MockMultipartFile("file", "photo.png", "image/png", new byte[] {1, 2, 3});

        StorageService.UploadResult result = storageService.upload(file, "asset");

        var request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(request.capture(), any(RequestBody.class));
        assertEquals("public-attachments", request.getValue().bucket());
        assertEquals(
                "https://example.supabase.co/storage/v1/object/public/public-attachments/" + result.storageKey(),
                result.url());
    }

    @Test
    void privateUploadUsesBackupBucket(@TempDir Path tempDir) throws Exception {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());
        Path dump = Files.write(tempDir.resolve("snapshot.dump"), new byte[] {1, 2, 3});

        storageService.uploadPrivateFile(dump, "backups", "application/octet-stream");

        var request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(request.capture(), any(RequestBody.class));
        assertEquals("private-backups", request.getValue().bucket());
    }

    @Test
    void legacyBackupDownloadFallsBackOnlyAfterNotFound() {
        GetObjectRequest privateRequest = GetObjectRequest.builder()
                .bucket("private-backups")
                .key("backups/legacy.dump")
                .build();
        when(s3Client.getObject(privateRequest)).thenThrow(S3Exception.builder()
                .statusCode(404)
                .awsErrorDetails(AwsErrorDetails.builder().errorCode("NoSuchKey").build())
                .build());

        storageService.downloadPrivateFile("backups/legacy.dump");

        verify(s3Client).getObject(GetObjectRequest.builder()
                .bucket("public-attachments")
                .key("backups/legacy.dump")
                .build());
    }

    @Test
    void authorizationFailureDoesNotFallBackToPublicBucket() {
        GetObjectRequest privateRequest = GetObjectRequest.builder()
                .bucket("private-backups")
                .key("backups/snapshot.dump")
                .build();
        when(s3Client.getObject(privateRequest)).thenThrow(S3Exception.builder().statusCode(403).build());

        assertThrows(S3Exception.class, () -> storageService.downloadPrivateFile("backups/snapshot.dump"));

        verify(s3Client, never()).getObject(GetObjectRequest.builder()
                .bucket("public-attachments")
                .key("backups/snapshot.dump")
                .build());
    }

    @Test
    void privateDeleteCleansNewAndLegacyLocations() {
        storageService.deletePrivateFile("backups/snapshot.dump");

        verify(s3Client).deleteObject(DeleteObjectRequest.builder()
                .bucket("private-backups")
                .key("backups/snapshot.dump")
                .build());
        verify(s3Client).deleteObject(DeleteObjectRequest.builder()
                .bucket("public-attachments")
                .key("backups/snapshot.dump")
                .build());
    }
}
