package com.airtelsync.backend.persistence;

import com.airtelsync.backend.application.DocumentStorage;
import com.airtelsync.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import java.time.Duration;
import java.util.*;

@Component
@ConditionalOnProperty(name = "sync.documents", havingValue = "s3")
public class S3DocumentStorage implements DocumentStorage {
    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;
    public S3DocumentStorage(S3Client client, S3Presigner presigner, @Value("${SYNC_DOCUMENTS_BUCKET}") String bucket) {
        if (bucket.isBlank()) throw new IllegalArgumentException("SYNC_DOCUMENTS_BUCKET is required");
        this.client = client; this.presigner = presigner; this.bucket = bucket;
    }
    public Upload authorize(String subject, String id, String key, String type, long size) {
        var request = PutObjectRequest.builder().bucket(bucket).key(key).contentType(type).contentLength(size)
            .ifNoneMatch("*").build();
        var signed = presigner.presignPutObject(PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(5)).putObjectRequest(request).build());
        var headers = new HashMap<String, String>();
        signed.signedHeaders().forEach((name, values) -> {
            // Browser supplies Host and Content-Length itself.
            if (!name.equalsIgnoreCase("host") && !name.equalsIgnoreCase("content-length"))
                headers.put(name.toLowerCase(Locale.ROOT), String.join(",", values));
        });
        headers.put("content-type", type);
        headers.put("if-none-match", "*");
        return new Upload(signed.url().toExternalForm(), Map.copyOf(headers));
    }
    public void delete(String key) { client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build()); }
    public void verify(String key, String type, long size) {
        try {
            var head = client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            if (head.contentLength() != size || !type.equals(head.contentType()))
                throw ApiException.conflict("Uploaded size/content type does not match the authorization.");
        } catch (NoSuchKeyException ex) {
            throw ApiException.conflict("Upload the document before completing it.");
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) throw ApiException.conflict("Upload the document before completing it.");
            throw ex;
        }
    }
}
