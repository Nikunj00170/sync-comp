package com.airtelsync.backend.application;

import com.airtelsync.backend.domain.model.*;
import com.airtelsync.backend.dto.request.UploadRequest;
import com.airtelsync.backend.exception.ApiException;
import com.airtelsync.backend.persistence.CustomerStore;
import org.springframework.stereotype.Service;
import java.io.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class CustomerDocumentService {
    public record PendingUpload(String id, String name, String type, long size, String key, String expiresAt, DocumentMeta completed, boolean deleted) {}
    public record Quota(int count) {}
    public record DocumentView(String id, String name, String type, long size, String expiresAt, String status) {}
    public record UploadResponse(String uploadUrl, String documentId, String expiresAt, Map<String, String> headers) {}
    private final CustomerStore store;
    private final DocumentStorage storage;
    public CustomerDocumentService(CustomerStore store, DocumentStorage storage) { this.store = store; this.storage = storage; }

    public CustomerStore.Page<DocumentView> list(String subject, int limit, String after) {
        var page = store.list(subject, "DOCUMENT#", PendingUpload.class, limit, after);
        var views = page.items().stream().filter(upload -> !upload.deleted()).map(upload ->
            new DocumentView(upload.id(), upload.name(), upload.type(), upload.size(), upload.expiresAt(),
                upload.completed() != null ? "uploaded" : Instant.parse(upload.expiresAt()).isBefore(Instant.now()) ? "expired" : "pending")).toList();
        return new CustomerStore.Page<>(views, page.next());
    }
    public UploadResponse authorize(String subject, UploadRequest request) {
        var quota = store.get(subject, "UPLOAD_QUOTA", Quota.class);
        int count = quota.map(q -> q.value().count()).orElse(0);
        if (count >= 8) throw ApiException.conflict("A maximum of eight documents is allowed.");
        String id = UUID.randomUUID().toString();
        String owner = Base64.getUrlEncoder().withoutPadding().encodeToString(subject.getBytes(StandardCharsets.UTF_8));
        String key = "customers/" + owner + "/documents/" + id;
        var upload = new PendingUpload(id, request.name(), request.type(), request.size(), key,
            Instant.now().plusSeconds(300).toString(), null, false);
        // Sign before reserving a slot, so provider failures do not consume the quota.
        var authorization = storage.authorize(subject, id, key, request.type(), request.size());
        store.transact(subject, List.of(CustomerStore.Write.create("DOCUMENT#" + id, upload),
            CustomerStore.Write.replace("UPLOAD_QUOTA", new Quota(count + 1), quota.map(CustomerStore.Stored::version).orElse(0L))));
        return new UploadResponse(authorization.url(), id, upload.expiresAt(), authorization.headers());
    }
    public void putLocal(String subject, String id, String type, InputStream input) throws IOException {
        var upload = get(subject, id).value();
        requirePending(upload);
        if (!upload.type().equals(type)) throw new IllegalArgumentException("Content-Type does not match the upload authorization");
        byte[] bytes = input.readNBytes((int) upload.size() + 1);
        if (bytes.length != upload.size()) throw new IllegalArgumentException("Content length does not match the upload authorization");
        storage.putLocal(upload.key(), type, bytes);
    }
    public DocumentMeta complete(String subject, String id) {
        var current = get(subject, id);
        var upload = current.value();
        if (upload.completed() != null) return upload.completed();
        requirePending(upload);
        storage.verify(upload.key(), upload.type(), upload.size());
        var document = new DocumentMeta(id, upload.name(), upload.size(), upload.type(), Instant.now().toString());
        var kycRecord = store.get(subject, "KYC", Kyc.class);
        var kyc = kycRecord.map(CustomerStore.Stored::value).orElseGet(CustomerKycService::pending);
        var documents = new ArrayList<>(kyc.documents()); documents.add(document);
        var nextKyc = new Kyc("pending", kyc.provider(), false, List.copyOf(documents), null);
        var completed = new PendingUpload(id, upload.name(), upload.type(), upload.size(), upload.key(), upload.expiresAt(), document, false);
        store.transact(subject, List.of(CustomerStore.Write.replace("DOCUMENT#" + id, completed, current.version()),
            CustomerStore.Write.replace("KYC", nextKyc, kycRecord.map(CustomerStore.Stored::version).orElse(0L)),
            CustomerStore.Write.create("AUDIT#" + Instant.now() + "#" + UUID.randomUUID(),
                new CustomerKycService.Audit("document_completed", Instant.now().toString()))));
        return document;
    }
    public UploadResponse renew(String subject, String id) {
        var current = get(subject, id); var upload = current.value();
        if (upload.completed() != null) throw ApiException.conflict("This document is already complete.");
        var authorization = storage.authorize(subject, id, upload.key(), upload.type(), upload.size());
        var next = new PendingUpload(id, upload.name(), upload.type(), upload.size(), upload.key(),
            Instant.now().plusSeconds(300).toString(), null, false);
        store.transact(subject, List.of(CustomerStore.Write.replace("DOCUMENT#" + id, next, current.version())));
        return new UploadResponse(authorization.url(), id, next.expiresAt(), authorization.headers());
    }
    public void delete(String subject, String id) {
        var current = store.get(subject, "DOCUMENT#" + id, PendingUpload.class).orElseThrow(ApiException::notFound);
        var upload = current.value();
        if (upload.deleted()) { storage.delete(upload.key()); return; }
        var quota = store.get(subject, "UPLOAD_QUOTA", Quota.class).orElseThrow();
        var kycRecord = store.get(subject, "KYC", Kyc.class);
        var kyc = kycRecord.map(CustomerStore.Stored::value).orElseGet(CustomerKycService::pending);
        var nextKyc = new Kyc("pending", kyc.provider(), false,
            kyc.documents().stream().filter(d -> !d.id().equals(id)).toList(), null);
        var tombstone = new PendingUpload(id, "", upload.type(), upload.size(), upload.key(), upload.expiresAt(), null, true);
        store.transact(subject, List.of(CustomerStore.Write.replace("DOCUMENT#" + id, tombstone, current.version()),
            CustomerStore.Write.replace("UPLOAD_QUOTA", new Quota(quota.value().count() - 1), quota.version()),
            CustomerStore.Write.replace("KYC", nextKyc, kycRecord.map(CustomerStore.Stored::version).orElse(0L)),
            CustomerStore.Write.create("AUDIT#" + Instant.now() + "#" + UUID.randomUUID(),
                new CustomerKycService.Audit("document_deleted", Instant.now().toString()))));
        // Invalidate KYC before object deletion. A failed cleanup can be retried safely.
        storage.delete(upload.key());
    }
    private CustomerStore.Stored<PendingUpload> get(String subject, String id) {
        return store.get(subject, "DOCUMENT#" + id, PendingUpload.class).filter(record -> !record.value().deleted()).orElseThrow(ApiException::notFound);
    }
    private void requirePending(PendingUpload upload) {
        if (upload.completed() != null) throw ApiException.conflict("This document is already complete.");
        if (Instant.parse(upload.expiresAt()).isBefore(Instant.now())) throw ApiException.conflict("The upload authorization has expired.");
    }
}
