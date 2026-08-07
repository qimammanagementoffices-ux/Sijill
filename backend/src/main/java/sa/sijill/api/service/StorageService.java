package sa.sijill.api.service;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import sa.sijill.api.error.ApiException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

// Wraps the S3-compatible client for Supabase Storage. Storage keys are
// always server-generated UUIDs — the client-supplied filename is stored
// separately for display and is never used to build a path, so there's no
// path-traversal or overwrite risk from an attacker-controlled filename
// (master spec §8: "safe filenames").
@Service
public class StorageService {

    private final S3Client s3Client;
    private final String bucket;
    private final String publicUrlBase;

    public StorageService(
            S3Client s3Client,
            @Value("${app.object-storage.bucket}") String bucket,
            @Value("${app.object-storage.public-url-base}") String publicUrlBase) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.publicUrlBase = publicUrlBase;
    }

    public record UploadResult(String storageKey, String url) {}

    public UploadResult upload(MultipartFile file, String keyPrefix) {
        String extension = extensionOf(file.getOriginalFilename());
        String key = keyPrefix + "/" + UUID.randomUUID() + extension;
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (Exception e) {
            throw ApiException.internal("Failed to upload file");
        }
        return new UploadResult(key, publicUrlBase + "/" + bucket + "/" + key);
    }

    // Best-effort: an unreachable/misconfigured object store shouldn't block
    // removing the database record (an orphaned remote object is a much
    // smaller problem than a delete button that silently does nothing).
    public void delete(String storageKey) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(storageKey).build());
        } catch (Exception ignored) {
        }
    }

    private String extensionOf(String originalFilename) {
        if (originalFilename == null) return "";
        int dot = originalFilename.lastIndexOf('.');
        if (dot < 0 || dot == originalFilename.length() - 1) return "";
        String ext = originalFilename.substring(dot).toLowerCase();
        // Only allow a short alphanumeric extension — reject anything that
        // could smuggle path separators or unexpected characters.
        return ext.matches("\\.[a-z0-9]{1,5}") ? ext : "";
    }
}
