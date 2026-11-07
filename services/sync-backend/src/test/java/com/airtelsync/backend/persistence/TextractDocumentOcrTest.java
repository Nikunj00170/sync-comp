package com.airtelsync.backend.persistence;

import com.airtelsync.backend.application.DocumentStorage;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.textract.TextractClient;
import software.amazon.awssdk.services.textract.model.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

class TextractDocumentOcrTest {
    final DocumentStorage storage = mock(DocumentStorage.class);
    final TextractClient client = mock(TextractClient.class);
    final TextractDocumentOcr ocr = new TextractDocumentOcr(storage, client);
    @Test void unsupportedPdfRequiresReviewWithoutCallingProvider() {
        assertEquals("", ocr.extract("owner/key", "application/pdf").text());
        verifyNoInteractions(storage, client);
    }
    @Test void sendsStoredBytesAndDiscardsLowConfidenceOrNonLineBlocks() {
        byte[] bytes = {1, 2, 3}; when(storage.read("owner/key")).thenReturn(bytes);
        when(client.detectDocumentText(any(DetectDocumentTextRequest.class))).thenReturn(DetectDocumentTextResponse.builder().blocks(
            Block.builder().blockType(BlockType.LINE).text("Clear text").confidence(99f).build(),
            Block.builder().blockType(BlockType.LINE).text("Ambiguous identifier").confidence(50f).build(),
            Block.builder().blockType(BlockType.WORD).text("duplicate").confidence(99f).build()).build());
        assertEquals("Clear text", ocr.extract("owner/key", "image/png").text());
        var request = ArgumentCaptor.forClass(DetectDocumentTextRequest.class);
        verify(client).detectDocumentText(request.capture());
        assertArrayEquals(bytes, request.getValue().document().bytes().asByteArray());
    }
    @Test void oversizeImageRequiresReviewWithoutCallingProvider() {
        when(storage.read("owner/key")).thenReturn(new byte[5 * 1024 * 1024 + 1]);
        assertEquals("", ocr.extract("owner/key", "image/png").text());
        verifyNoInteractions(client);
    }
}
