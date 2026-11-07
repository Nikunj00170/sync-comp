package com.airtelsync.backend.application;

import com.airtelsync.backend.domain.kyc.*;
import com.airtelsync.backend.domain.model.Kyc;
import com.airtelsync.backend.domain.profile.ProfileService;
import com.airtelsync.backend.persistence.CustomerStore;
import com.airtelsync.backend.exception.ApiException;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class SmartKycService {
    private final CustomerStore store; private final DocumentOcr ocr;
    private final DemoPolicy demo; private final KycChecks checks;
    public SmartKycService(CustomerStore store, DocumentOcr ocr, DemoPolicy demo, MockRegistry registry) {
        this.store = store; this.ocr = ocr; this.demo = demo; this.checks = new KycChecks(registry);
    }
    public KycChecks.Assessment assess(String subject) {
        demo.requireEnabled();
        var current = store.get(subject, "KYC", Kyc.class).orElseThrow(() -> ApiException.conflict("Upload documents and give KYC consent first."));
        if (!current.value().consent()) throw ApiException.conflict("KYC consent is required before document extraction or registry lookup.");
        var profileRecord = store.get(subject, "PROFILE", com.airtelsync.backend.domain.model.Profile.class)
            .orElseThrow(() -> ApiException.conflict("Complete your business profile first."));
        var profile = profileRecord.value();
        var inputs = new ArrayList<KycChecks.Input>();
        for (var doc : current.value().documents()) {
            var upload = store.get(subject, "DOCUMENT#" + doc.id(), CustomerDocumentService.PendingUpload.class)
                .filter(r -> !r.value().deleted() && r.value().completed() != null).orElseThrow(ApiException::notFound).value();
            var extracted = ocr.extract(upload.key(), upload.type());
            inputs.add(new KycChecks.Input(doc.id(), extracted.text(), extracted.engine()));
        }
        // Fixed date is exclusively the synthetic case's requested validation date, never a production clock.
        var result = checks.assess(inputs, profile.business(), profile.hasGstin(), LocalDate.of(2026, 7, 15));
        // Conditional write detects consent/document changes during extraction. Persist no raw OCR/identifiers.
        store.transact(subject, List.of(CustomerStore.Write.replace("KYC", current.value(), current.version()),
            CustomerStore.Write.replace("PROFILE", profile, profileRecord.version())));
        return result;
    }
}
