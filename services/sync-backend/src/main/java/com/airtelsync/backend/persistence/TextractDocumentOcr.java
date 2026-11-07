package com.airtelsync.backend.persistence;

import com.airtelsync.backend.application.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.textract.TextractClient;
import software.amazon.awssdk.services.textract.model.*;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "sync.kyc.ocr", havingValue = "textract")
public class TextractDocumentOcr implements DocumentOcr {
    private final DocumentStorage storage;
    private final TextractClient client;
    public TextractDocumentOcr(DocumentStorage storage, TextractClient client) { this.storage = storage; this.client = client; }
    public Extraction extract(String key, String type) {
        // Synchronous Bytes supports PNG/JPEG; PDF/multipage uses a separate asynchronous workflow.
        if (!type.equals("image/png") && !type.equals("image/jpeg")) return new Extraction("", "textract-image-required");
        byte[] bytes = storage.read(key);
        if (bytes.length > 5 * 1024 * 1024) return new Extraction("", "textract-image-too-large");
        var result = client.detectDocumentText(DetectDocumentTextRequest.builder()
            .document(Document.builder().bytes(SdkBytes.fromByteArray(bytes)).build()).build());
        return new Extraction(result.blocks().stream().filter(b -> b.blockType() == BlockType.LINE)
            .filter(b -> b.confidence() != null && b.confidence() >= 85)
            .map(Block::text).collect(Collectors.joining("\n")), "aws-textract");
    }
}
