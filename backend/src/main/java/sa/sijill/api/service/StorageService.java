package sa.sijill.api.service;

import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import sa.sijill.api.error.ApiException;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

// Wraps the S3-compatible client for Supabase Storage. Storage keys are
// always server-generated UUIDs — the client-supplied filename is stored
// separately for display and is never used to build a path, so there's no
// path-traversal or overwrite risk from an attacker-controlled filename
// (master spec §8: "safe filenames").
@Service
public class StorageService {

    private final S3Client s3Client;
    private final String attachmentBucket;
    private final String backupBucket;
    private final String publicUrlBase;

    public StorageService(
            S3Client s3Client,
            @Value("${app.object-storage.bucket}") String attachmentBucket,
            @Value("${app.object-storage.backup-bucket}") String backupBucket,
            @Value("${app.object-storage.public-url-base}") String publicUrlBase) {
        this.s3Client = s3Client;
        this.attachmentBucket = attachmentBucket;
        this.backupBucket = backupBucket;
        this.publicUrlBase = publicUrlBase;
    }

    public record UploadResult(String storageKey, String url) {}

    public UploadResult upload(MultipartFile file, String keyPrefix) {
        String extension = extensionOf(file.getOriginalFilename());
        String key = keyPrefix + "/" + UUID.randomUUID() + extension;
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(attachmentBucket)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (Exception e) {
            throw ApiException.internal("Failed to upload file");
        }
        return new UploadResult(key, publicUrlBase + "/" + attachmentBucket + "/" + key);
    }

    // For files that must never be reachable by a public URL (e.g. database
    // backups containing PII/PIN hashes) — uploads without returning a
    // public URL, and downloads stream back through our own authenticated
    // endpoint instead of the bucket's public path.
    public String uploadPrivateFile(Path filePath, String keyPrefix, String contentType) {
        String key = keyPrefix + "/" + UUID.randomUUID() + ".dump";
        try {
            s3Client.putObject(
                    PutObjectRequest.builder().bucket(backupBucket).key(key).contentType(contentType).build(),
                    RequestBody.fromFile(filePath));
        } catch (Exception e) {
            throw ApiException.internal("Failed to upload file");
        }
        return key;
    }

    public ResponseInputStream<GetObjectResponse> downloadPrivateFile(String storageKey) {
        try {
            return s3Client.getObject(GetObjectRequest.builder().bucket(backupBucket).key(storageKey).build());
        } catch (S3Exception e) {
            // Backup rows created before the bucket split contain only the
            // object key. During the compatibility window, try the former
            // shared bucket only when the object is genuinely absent from
            // the new private bucket; configuration/auth failures must stay
            // visible instead of being hidden by a fallback.
            if (backupBucket.equals(attachmentBucket) || !isNotFound(e)) {
                throw e;
            }
            return s3Client.getObject(GetObjectRequest.builder().bucket(attachmentBucket).key(storageKey).build());
        }
    }

    // Best-effort: an unreachable/misconfigured object store shouldn't block
    // removing the database record (an orphaned remote object is a much
    // smaller problem than a delete button that silently does nothing).
    public void delete(String storageKey) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(attachmentBucket).key(storageKey).build());
        } catch (Exception ignored) {
        }
    }

    // Delete from both locations during the compatibility window because old
    // backup rows do not identify which bucket owns their object. S3 deletes
    // are idempotent, and backup keys live under their own backups/ prefix.
    public void deletePrivateFile(String storageKey) {
        deleteFromBucket(backupBucket, storageKey);
        if (!backupBucket.equals(attachmentBucket)) {
            deleteFromBucket(attachmentBucket, storageKey);
        }
    }

    private void deleteFromBucket(String targetBucket, String storageKey) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(targetBucket).key(storageKey).build());
        } catch (Exception ignored) {
        }
    }

    private boolean isNotFound(S3Exception exception) {
        if (exception.statusCode() == 404) return true;
        return exception.awsErrorDetails() != null
                && "NoSuchKey".equals(exception.awsErrorDetails().errorCode());
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
