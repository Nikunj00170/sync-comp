package com.airtelsync.backend.application;

/** Implementations must read server-owned uploaded bytes, never customer-supplied OCR text. */
public interface DocumentOcr {
    record Extraction(String text, String engine) {}
    Extraction extract(String key, String contentType);
}
