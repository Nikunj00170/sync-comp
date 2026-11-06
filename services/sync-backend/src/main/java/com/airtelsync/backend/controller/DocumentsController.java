package com.airtelsync.backend.controller;

import com.airtelsync.backend.application.CustomerDocumentService;
import com.airtelsync.backend.domain.model.DocumentMeta;
import com.airtelsync.backend.dto.request.UploadRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

@RestController
@RequestMapping("/v1/documents")
public class DocumentsController {
    private final CustomerDocumentService documents;
    public DocumentsController(CustomerDocumentService documents) { this.documents = documents; }
    @GetMapping
    public ResponseEntity<java.util.List<CustomerDocumentService.DocumentView>> list(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) String after) {
        return OrdersController.page(documents.list(jwt.getSubject(), limit, after));
    }
    @PostMapping("/uploads")
    public CustomerDocumentService.UploadResponse upload(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UploadRequest request) {
        return documents.authorize(jwt.getSubject(), request);
    }
    @PutMapping("/{id}/content")
    public ResponseEntity<Void> content(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
        @RequestHeader("Content-Type") String type, HttpServletRequest request) throws IOException {
        documents.putLocal(jwt.getSubject(), id, type, request.getInputStream());
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/{id}/uploads")
    public CustomerDocumentService.UploadResponse renew(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return documents.renew(jwt.getSubject(), id);
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        documents.delete(jwt.getSubject(), id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/{id}/complete")
    public DocumentMeta complete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return documents.complete(jwt.getSubject(), id);
    }
}
