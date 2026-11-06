package com.airtelsync.backend.application;

import com.airtelsync.backend.domain.model.*;
import com.airtelsync.backend.persistence.CustomerStore;
import com.airtelsync.backend.exception.ApiException;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;

@Service
public class CustomerKycService {
    public record Audit(String action, String at) {}
    private final CustomerStore store;
    private final DemoPolicy demo;
    private final SmartKycService smart;
    public CustomerKycService(CustomerStore store, DemoPolicy demo, SmartKycService smart) { this.store = store; this.demo = demo; this.smart = smart; }
    public static Kyc pending() { return new Kyc("pending", null, false, List.of(), null); }
    public Kyc get(String subject) { return store.get(subject, "KYC", Kyc.class).map(CustomerStore.Stored::value).orElseGet(CustomerKycService::pending); }
    public Kyc consent(String subject, String provider, boolean consent) {
        var current = store.get(subject, "KYC", Kyc.class);
        var old = current.map(CustomerStore.Stored::value).orElseGet(CustomerKycService::pending);
        var next = new Kyc("pending", provider, consent, old.documents(), null);
        save(subject, next, current.map(CustomerStore.Stored::version).orElse(0L), consent ? "consent_granted" : "consent_revoked");
        return next;
    }
    public Kyc verifyDemo(String subject) {
        demo.requireEnabled();
        var current = store.get(subject, "KYC", Kyc.class).orElseThrow(() -> ApiException.conflict("Complete consent and upload two documents first."));
        var old = current.value();
        if (!old.consent() || old.provider() == null || old.documents().size() < 2)
            throw ApiException.conflict("Consent, a provider and two completed documents are required.");
        var assessment = smart.assess(subject);
        if (!"ready".equals(assessment.status()))
            throw ApiException.conflict("Documents need review. Run Smart KYC checks for the issues before verification.");
        // assess performs a conditional write to detect changed consent/documents; reload its version.
        current = store.get(subject, "KYC", Kyc.class).orElseThrow(ApiException::notFound);
        if (!current.value().equals(old)) throw ApiException.conflict("Documents or consent changed. Run verification again.");
        var next = new Kyc("demo_verified", old.provider(), true, old.documents(), Instant.now().toString());
        save(subject, next, current.version(), "demo_verified");
        return next;
    }
    private void save(String subject, Kyc next, long version, String action) {
        store.transact(subject, List.of(CustomerStore.Write.replace("KYC", next, version),
            CustomerStore.Write.create("AUDIT#" + Instant.now() + "#" + UUID.randomUUID(), new Audit(action, Instant.now().toString()))));
    }
}
