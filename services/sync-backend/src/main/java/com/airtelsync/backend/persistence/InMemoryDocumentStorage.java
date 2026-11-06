package com.airtelsync.backend.persistence;

import com.airtelsync.backend.application.DocumentStorage;
import com.airtelsync.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "sync.documents", havingValue = "memory", matchIfMissing = true)
public class InMemoryDocumentStorage implements DocumentStorage {
    private record Content(String type, byte[] bytes) {}
    private final Map<String, Content> objects = new ConcurrentHashMap<>();
    private final String base;
    public InMemoryDocumentStorage(@Value("${SYNC_PUBLIC_BASE_URL:http://localhost:8080}") String base) {
        this.base = base.replaceAll("/$", "");
    }
    public Upload authorize(String subject, String id, String key, String type, long size) {
        return new Upload(base + "/v1/documents/" + id + "/content", Map.of("Content-Type", type));
    }
    public void putLocal(String key, String type, byte[] content) {
        if (objects.putIfAbsent(key, new Content(type, content.clone())) != null)
            throw ApiException.conflict("This upload already has content.");
    }
    public void delete(String key) { objects.remove(key); }
    public void verify(String key, String type, long size) {
        var content = objects.get(key);
        if (content == null || content.bytes().length != size || !content.type().equals(type))
            throw ApiException.conflict("Upload is missing or its size/content type does not match.");
    }
}
