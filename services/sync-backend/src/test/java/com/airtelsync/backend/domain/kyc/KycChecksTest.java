package com.airtelsync.backend.domain.kyc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.airtelsync.backend.persistence.FixtureDocumentOcr;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class KycChecksTest {
    final MockRegistry registry = new MockRegistry();
    final KycChecks checks = new KycChecks(registry);
    final LocalDate today = LocalDate.of(2026, 7, 15);
    List<KycChecks.Input> applicant(int n) throws Exception {
        var fixtures = new ObjectMapper().readValue(getClass().getResourceAsStream("/kyc-ocr-fixtures.json"), FixtureDocumentOcr.Fixture[].class);
        var byHash = new HashMap<String, String>(); for (var f : fixtures) byHash.put(f.sha256(), f.text());
        var inputs = new ArrayList<KycChecks.Input>();
        try (var files = Files.list(Path.of("../../case_source/kyc_documents"))) {
            for (var file : files.filter(f -> f.getFileName().toString().startsWith("K%02d_".formatted(n))).sorted().toList()) {
                String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file)));
                assertTrue(byHash.containsKey(hash), "Actual image bytes must match OCR cache");
                inputs.add(new KycChecks.Input(file.getFileName().toString(), byHash.get(hash), "tesseract-cache"));
            }
        }
        return inputs;
    }
    @Test void supplied47ImagesProduceConservativeApplicantDecisions() throws Exception {
        String[] businesses = {"Vindhya Tours & Travels", "Harmony Dental Care", "Ganesh Woodcraft", "Saffron Dental Care LLP",
            "Balaji Realty LLP", "Saffron Unisex Salon", "Neelgiri Physio Clinic", "Green Leaf Legal Associates",
            "Kaveri Insurance Advisors", "Kaveri Stays LLP", "Trinity Bake House Pvt Ltd", "Star Electronics"};
        int count = 0;
        for (int n = 1; n <= 12; n++) {
            var input = applicant(n); count += input.size();
            var report = checks.assess(input, businesses[n - 1], true, today);
            if (n == 5) assertEquals("ready", report.status(), report.toString());
            else if (n == 1) assertTrue(report.documents().stream().anyMatch(d -> d.issues().contains("GSTIN_NOT_ACTIVE")));
            else if (n == 11) assertTrue(report.documents().stream().anyMatch(d -> d.issues().contains("ADDRESS_PROOF_DATE_OUTSIDE_90_DAYS")));
            if (n == 2 || n == 4) assertEquals("needs_review", report.status());
        }
        assertEquals(47, count);
    }
    @Test void businessMismatchAndUnknownBytesNeverPass() throws Exception {
        assertEquals("needs_review", checks.assess(applicant(5), "Another business", true, today).status());
        assertEquals("needs_review", checks.assess(List.of(new KycChecks.Input("a", "", "unknown")), "Business", false, today).status());
    }
    @Test void checksumAndMasksDoNotRelaxSyntheticPanOrExposeIdentifier() {
        assertTrue(MockRegistry.validGstin("32TZAXB5481U1Z1"));
        assertFalse(MockRegistry.validGstin("32TZAXB5481U1Z2"));
        assertEquals("•••••••••••U1Z1", MockRegistry.mask("32TZAXB5481U1Z1"));
    }
}
