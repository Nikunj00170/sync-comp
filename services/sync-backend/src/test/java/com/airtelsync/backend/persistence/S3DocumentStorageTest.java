package com.airtelsync.backend.persistence;

import com.airtelsync.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import java.net.URI;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class S3DocumentStorageTest {
    @Test void signatureIsPrivateShortLivedAndPreventsOverwrites() {
        var client = mock(S3Client.class);
        try (var presigner = S3Presigner.builder().region(Region.AP_SOUTH_1)
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("test-access", "test-secret"))).build()) {
            var storage = new S3DocumentStorage(client, presigner, "private-documents");
            var upload = storage.authorize("alice", "id", "customers/alice/documents/id", "application/pdf", 4);
            assertEquals("https", URI.create(upload.url()).getScheme());
            assertTrue(upload.url().contains("X-Amz-Expires=300"));
            assertTrue(upload.url().contains("X-Amz-Signature="));
            assertTrue(upload.url().contains("if-none-match"));
            assertEquals("*", upload.headers().get("If-None-Match"));
            verifyNoInteractions(client);
        }
    }
    @Test void headMustMatchExpectedSizeAndMimeAndMissingObjectIsConflict() {
        var client = mock(S3Client.class); var signer = mock(S3Presigner.class);
        var storage = new S3DocumentStorage(client, signer, "private-documents");
        when(client.headObject(any(HeadObjectRequest.class))).thenReturn(HeadObjectResponse.builder().contentLength(4L).contentType("application/pdf").build());
        assertDoesNotThrow(() -> storage.verify("private/key", "application/pdf", 4));
        assertThrows(ApiException.class, () -> storage.verify("private/key", "image/png", 4));
        assertThrows(ApiException.class, () -> storage.verify("private/key", "application/pdf", 5));
        when(client.headObject(any(HeadObjectRequest.class))).thenThrow(S3Exception.builder().statusCode(404).build());
        assertEquals(409, assertThrows(ApiException.class, () -> storage.verify("private/key", "application/pdf", 4)).status().value());
    }
}
