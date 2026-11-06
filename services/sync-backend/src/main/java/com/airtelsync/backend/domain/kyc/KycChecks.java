package com.airtelsync.backend.domain.kyc;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;

/** Conservative extraction: ambiguous/unreadable fields require review; never guess identifier digits. */
public final class KycChecks {
    public record Input(String id, String text, String engine) {}
    public record Finding(String documentId, String kind, String maskedIdentifier, List<String> issues) {}
    public record Assessment(String status, String asOf, String source, List<Finding> documents, List<String> issues) {}
    private final MockRegistry registry;
    public KycChecks(MockRegistry registry) { this.registry = registry; }
    private static String normal(String value) { return value.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", ""); }
    private static boolean contains(String text, String value) { return value != null && !value.isBlank() && normal(text.replaceAll("(?i)place of business", "")).contains(normal(value)); }
    private static String match(String text, String regex) { var m = Pattern.compile(regex).matcher(text); return m.find() ? m.group() : ""; }
    public Assessment assess(List<Input> inputs, String business, boolean requiresGst, LocalDate today) {
        var findings = new ArrayList<Finding>(); var issues = new ArrayList<String>();
        MockRegistry.Gst gst = null; MockRegistry.Udyam udyam = null;
        var kinds = new HashSet<String>();
        for (var input : inputs) {
            String text = input.text(); String compact = text.replaceAll("[\\s]+", "").toUpperCase(Locale.ROOT);
            String kind = text.toLowerCase(Locale.ROOT).contains("gst registration") ? "gst"
                : text.toLowerCase(Locale.ROOT).contains("udyam registration") ? "udyam"
                : text.toLowerCase(Locale.ROOT).contains("electricity bill") ? "address"
                : text.toLowerCase(Locale.ROOT).contains("signatory id") ? "signatory" : "unknown";
            var problems = new ArrayList<String>(); String id = "";
            if (!kinds.add(kind)) problems.add("DUPLICATE_DOCUMENT_KIND");
            if (kind.equals("unknown")) problems.add("UNREADABLE_OR_UNSUPPORTED_DOCUMENT");
            if (!kind.equals("unknown") && !contains(text, business)) problems.add("BUSINESS_NAME_MISMATCH");
            if (kind.equals("gst")) {
                id = match(compact, "[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]");
                if (!MockRegistry.validGstin(id)) problems.add("GSTIN_FORMAT_OR_CHECKSUM");
                var row = registry.gst(id);
                if (row.isEmpty()) problems.add("GSTIN_NOT_FOUND");
                else {
                    gst = row.get();
                    if (!"Active".equals(gst.status())) problems.add("GSTIN_NOT_ACTIVE");
                    if (!contains(text, gst.legal_name()) || !contains(text, gst.trade_name())) problems.add("REGISTRY_NAME_MISMATCH");
                    if (!contains(text, gst.principal_place_of_business())) problems.add("REGISTRY_ADDRESS_MISMATCH");
                }
            } else if (kind.equals("udyam")) {
                id = match(compact, "UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}");
                var row = registry.udyam(id);
                if (row.isEmpty()) problems.add("UDYAM_NOT_FOUND_OR_UNREADABLE");
                else { udyam = row.get(); if (!contains(text, udyam.enterprise_name())) problems.add("REGISTRY_NAME_MISMATCH"); }
            } else if (kind.equals("address") || kind.equals("signatory")) {
                String date = match(text, "20[0-9]{2}-[0-9]{2}-[0-9]{2}");
                try {
                    LocalDate parsed = LocalDate.parse(date);
                    long age = ChronoUnit.DAYS.between(parsed, today);
                    if (kind.equals("address") && (age < 0 || age > 90)) problems.add("ADDRESS_PROOF_DATE_OUTSIDE_90_DAYS");
                    if (kind.equals("signatory") && age > 0) problems.add("SIGNATORY_ID_EXPIRED");
                } catch (java.time.DateTimeException ex) { problems.add("DOCUMENT_DATE_UNREADABLE"); }
            }
            findings.add(new Finding(input.id(), kind, id.isEmpty() ? null : MockRegistry.mask(id), List.copyOf(problems)));
        }
        if (!kinds.contains("gst") && !kinds.contains("udyam")) issues.add("BUSINESS_REGISTRATION_REQUIRED");
        if (requiresGst && gst == null) issues.add("ACTIVE_GSTIN_REQUIRED_FOR_PROFILE");
        if (!kinds.contains("address")) issues.add("ADDRESS_PROOF_REQUIRED");
        if (!kinds.contains("signatory")) issues.add("SIGNATORY_ID_REQUIRED");
        if (gst != null) {
            var address = inputs.stream().filter(i -> i.text().toLowerCase(Locale.ROOT).contains("electricity bill")).toList();
            for (var input : address) if (!contains(input.text(), gst.principal_place_of_business())) issues.add("ADDRESS_DOES_NOT_MATCH_GST_REGISTRY");
            if (udyam != null && !normal(gst.trade_name()).equals(normal(udyam.enterprise_name()))) issues.add("REGISTRATIONS_NAME_MISMATCH");
        }
        boolean valid = issues.isEmpty() && !findings.isEmpty() && findings.stream().allMatch(f -> f.issues().isEmpty());
        return new Assessment(valid ? "ready" : "needs_review", today.toString(), "synthetic-mock-registries", List.copyOf(findings), List.copyOf(issues));
    }
}
