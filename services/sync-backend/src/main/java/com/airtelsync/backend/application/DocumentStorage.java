package com.airtelsync.backend.application;

public interface DocumentStorage {
    record Upload(String url, java.util.Map<String, String> headers) {}
    Upload authorize(String subject, String id, String key, String type, long size);
    void delete(String key);
    void verify(String key, String type, long size);
    default void putLocal(String key, String type, byte[] content) {
        throw new IllegalArgumentException("Upload directly to the authorized object storage URL");
    }
}
