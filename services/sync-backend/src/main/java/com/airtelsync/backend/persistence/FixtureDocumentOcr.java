package com.airtelsync.backend.persistence;

import com.airtelsync.backend.application.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import java.security.MessageDigest;
import java.util.*;

/** Reproducible cached Tesseract output for the 47 supplied synthetic images ONLY. */
@Component
@ConditionalOnProperty(name = "sync.kyc.ocr", havingValue = "fixtures", matchIfMissing = true)
public class FixtureDocumentOcr implements DocumentOcr {
    public record Fixture(String sha256, String text) {}
    private final DocumentStorage storage;
    private final Map<String, String> text = new HashMap<>();
    public FixtureDocumentOcr(DocumentStorage storage) {
        this.storage = storage;
        try (var input = getClass().getResourceAsStream("/kyc-ocr-fixtures.json")) {
            for (var f : new ObjectMapper().readValue(input, Fixture[].class)) text.put(f.sha256(), f.text());
        } catch (Exception ex) { throw new IllegalStateException("Cannot load synthetic OCR fixtures", ex); }
    }
    public Extraction extract(String key, String type) {
        try {
            String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(storage.read(key)));
            return new Extraction(text.getOrDefault(digest, ""), "cached-tesseract-synthetic-only");
        } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
